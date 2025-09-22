import { Injectable } from '@angular/core';

export interface UIControl {
  key: string;
  label: string;
  type: string;
  inputType: string;
  defaultValue: any;
  required: boolean;
  options?: Array<{value: any, label: string}>;
  min?: number;
  max?: number;
  description?: string;
}

export interface ParameterSchema {
  type: 'object';
  properties: {
    [parameterName: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description?: string;
      default?: any;
      enum?: any[];
      format?: string;
      minimum?: number;
      maximum?: number;
      items?: any;
    };
  };
  required?: string[];
}

export interface ParameterFormField {
  parameter: UIControl;
  value: any;
  touched: boolean;
  valid: boolean;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParameterUIGeneratorService {

  /**
   * Generate UI controls based on parameter schema
   */
  generateParameterUI(schema: ParameterSchema): UIControl[] {
    const controls: UIControl[] = [];

    if (!schema.properties) {
      return controls;
    }

    Object.entries(schema.properties).forEach(([key, prop]) => {
      const control: UIControl = {
        key,
        label: prop.description || this.formatLabel(key),
        type: prop.type,
        inputType: this.determineInputType(prop),
        defaultValue: prop.default,
        required: schema.required?.includes(key) || false,
        description: prop.description
      };

      // Special handling for different formats and types
      if (prop.format === 'color') {
        control.inputType = 'color-picker';
      } else if (prop.format === 'url') {
        control.inputType = 'url-input';
      } else if (prop.format === 'email') {
        control.inputType = 'email-input';
      } else if (prop.enum) {
        control.inputType = 'select';
        control.options = prop.enum.map(value => ({ 
          value, 
          label: this.formatLabel(String(value)) 
        }));
      } else if (prop.type === 'number' && prop.minimum !== undefined && prop.maximum !== undefined) {
        control.inputType = 'slider';
        control.min = prop.minimum;
        control.max = prop.maximum;
      } else if (prop.type === 'boolean') {
        control.inputType = 'checkbox';
      } else if (prop.type === 'array') {
        control.inputType = 'list-editor';
      } else if (prop.type === 'object') {
        control.inputType = 'object-editor';
      }

      controls.push(control);
    });

    return controls;
  }

  /**
   * Determine the appropriate input type based on property definition
   */
  private determineInputType(prop: any): string {
    if (prop.format) {
      switch (prop.format) {
        case 'color': return 'color-picker';
        case 'url': return 'url-input';
        case 'email': return 'email-input';
        case 'date': return 'date-input';
        case 'time': return 'time-input';
        case 'datetime': return 'datetime-input';
        default: break;
      }
    }

    if (prop.enum) {
      return 'select';
    }

    switch (prop.type) {
      case 'string':
        if (prop.maxLength && prop.maxLength > 100) {
          return 'textarea';
        }
        return 'text-input';
      case 'number':
        if (prop.minimum !== undefined && prop.maximum !== undefined) {
          return 'slider';
        }
        return 'number-input';
      case 'boolean':
        return 'checkbox';
      case 'array':
        return 'list-editor';
      case 'object':
        return 'object-editor';
      default:
        return 'text-input';
    }
  }

  /**
   * Format a key into a human-readable label
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/-/g, ' '); // Replace hyphens with spaces
  }

  /**
   * Validate a parameter value against its schema property
   */
  validateParameter(value: any, property: any, required: boolean): {valid: boolean, errorMessage?: string} {
    // Check required
    if (required && (value === null || value === undefined || value === '')) {
      return {
        valid: false,
        errorMessage: 'This field is required'
      };
    }

    // If not required and empty, it's valid
    if (!required && (value === null || value === undefined || value === '')) {
      return { valid: true };
    }

    // Type validation
    switch (property.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            valid: false,
            errorMessage: 'Value must be a string'
          };
        }
        if (property.minLength && value.length < property.minLength) {
          return {
            valid: false,
            errorMessage: `Minimum length is ${property.minLength} characters`
          };
        }
        if (property.maxLength && value.length > property.maxLength) {
          return {
            valid: false,
            errorMessage: `Maximum length is ${property.maxLength} characters`
          };
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return {
            valid: false,
            errorMessage: 'Value must be a number'
          };
        }
        if (property.minimum !== undefined && numValue < property.minimum) {
          return {
            valid: false,
            errorMessage: `Minimum value is ${property.minimum}`
          };
        }
        if (property.maximum !== undefined && numValue > property.maximum) {
          return {
            valid: false,
            errorMessage: `Maximum value is ${property.maximum}`
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            valid: false,
            errorMessage: 'Value must be true or false'
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            valid: false,
            errorMessage: 'Value must be an array'
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return {
            valid: false,
            errorMessage: 'Value must be an object'
          };
        }
        break;
    }

    // Enum validation
    if (property.enum && !property.enum.includes(value)) {
      return {
        valid: false,
        errorMessage: `Value must be one of: ${property.enum.join(', ')}`
      };
    }

    // Format validation
    if (property.format) {
      switch (property.format) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return {
              valid: false,
              errorMessage: 'Invalid email format'
            };
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            return {
              valid: false,
              errorMessage: 'Invalid URL format'
            };
          }
          break;

        case 'color':
          const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!colorRegex.test(value)) {
            return {
              valid: false,
              errorMessage: 'Invalid color format (use #RRGGBB or #RGB)'
            };
          }
          break;
      }
    }

    return { valid: true };
  }

  /**
   * Create form fields from UI controls with initial values
   */
  createFormFields(controls: UIControl[], initialValues: any = {}): ParameterFormField[] {
    return controls.map(control => {
      const value = initialValues[control.key] !== undefined 
        ? initialValues[control.key] 
        : control.defaultValue;

      return {
        parameter: control,
        value,
        touched: false,
        valid: true,
        errorMessage: undefined
      };
    });
  }

  /**
   * Validate all form fields
   */
  validateFormFields(fields: ParameterFormField[], schema: ParameterSchema): ParameterFormField[] {
    return fields.map(field => {
      const property = schema.properties[field.parameter.key];
      const required = schema.required?.includes(field.parameter.key) || false;
      
      if (property) {
        const validation = this.validateParameter(field.value, property, required);
        return {
          ...field,
          valid: validation.valid,
          errorMessage: validation.errorMessage
        };
      }

      return field;
    });
  }

  /**
   * Convert form fields to parameter object
   */
  formFieldsToParameters(fields: ParameterFormField[]): any {
    const parameters: any = {};
    
    fields.forEach(field => {
      parameters[field.parameter.key] = field.value;
    });

    return parameters;
  }

  /**
   * Check if all form fields are valid
   */
  isFormValid(fields: ParameterFormField[]): boolean {
    return fields.every(field => field.valid);
  }

  /**
   * Get form validation summary
   */
  getValidationSummary(fields: ParameterFormField[]): {
    isValid: boolean;
    errorCount: number;
    errors: Array<{field: string, message: string}>;
  } {
    const errors = fields
      .filter(field => !field.valid && field.errorMessage)
      .map(field => ({
        field: field.parameter.label,
        message: field.errorMessage!
      }));

    return {
      isValid: errors.length === 0,
      errorCount: errors.length,
      errors
    };
  }

  /**
   * Reset form fields to default values
   */
  resetFormFields(fields: ParameterFormField[]): ParameterFormField[] {
    return fields.map(field => ({
      ...field,
      value: field.parameter.defaultValue,
      touched: false,
      valid: true,
      errorMessage: undefined
    }));
  }

  /**
   * Mark all fields as touched (useful for showing validation on submit)
   */
  markAllFieldsTouched(fields: ParameterFormField[]): ParameterFormField[] {
    return fields.map(field => ({
      ...field,
      touched: true
    }));
  }
}
