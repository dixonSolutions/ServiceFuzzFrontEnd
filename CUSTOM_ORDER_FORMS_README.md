# Custom Order Forms System

## Overview

A comprehensive custom order forms system that allows businesses to create, manage, and customize order forms with a drag-and-drop builder interface. The system stores form configurations as JSON in PostgreSQL JSONB columns for flexibility and scalability.

## Features

### 🎨 Form Builder
- **Drag-and-drop interface** for building forms
- **Live preview mode** to see forms as customers will
- **Component library** with categorized form elements
- **Real-time validation** and error handling
- **Template system** for quick form creation

### 📝 Form Components
All form components are fully customizable by tag and include:

#### Basic Input Types
- **Text Input** - Single line text entry
- **Email** - Email address with validation
- **Phone** - Phone number with formatting
- **Number** - Numeric input with validation
- **Textarea** - Multi-line text input
- **Password** - Secure password input

#### Selection Types
- **Dropdown** - Single selection dropdown
- **Multiselect** - Multiple selection dropdown
- **Radio Buttons** - Single choice radio buttons
- **Checkbox** - Single checkbox
- **Checkbox Group** - Multiple checkboxes

#### Date & Time Types
- **Calendar** - Date picker
- **Calendar Range** - Date range picker ⭐
- **Time** - Time picker
- **Date & Time** - Combined date and time picker

#### File Upload Types
- **File Upload** - General file upload
- **Image Upload** - Image-specific upload with preview

#### Advanced Types
- **Rating** - Star rating component
- **Slider** - Range slider input
- **Signature** - Digital signature pad
- **Location** - Location picker with map integration

#### Display Types
- **Heading** - Section headings
- **Paragraph** - Descriptive text
- **Divider** - Visual section separator
- **Image Display** - Display images in forms

### 🗄️ Database Structure

The system follows the JSON structure you specified:

```sql
-- PostgreSQL Table Structure
CREATE TABLE custom_order_forms (
    business_id TEXT PRIMARY KEY,
    form_json JSONB NOT NULL
);
```

### JSON Structure

```json
{
  "forms": [
    {
      "formId": "form_abc123",
      "formName": "Restaurant Order Form",
      "description": "Complete food ordering system",
      "status": "active",
      "createdDate": "2024-01-15T00:00:00Z",
      "updatedDate": "2024-02-20T00:00:00Z",
      "isPublished": true,
      "settings": {
        "allowMultipleSubmissions": true,
        "requireAuthentication": false,
        "sendEmailNotifications": true,
        "theme": "modern"
      },
      "components": [
        {
          "id": "comp_xyz789",
          "name": "customer_name",
          "type": "text",
          "label": "Customer Name",
          "required": true,
          "order": 0,
          "placeholder": "Enter your full name",
          "validation": {
            "minLength": 2,
            "maxLength": 50
          }
        }
      ]
    }
  ],
  "junction": [
    {
      "formId": "form_abc123",
      "services": [
        {
          "serviceId": "service_001",
          "serviceName": "Restaurant Delivery",
          "isActive": true
        },
        {
          "serviceId": "service_002", 
          "serviceName": "Catering Service",
          "isActive": true
        }
      ]
    }
  ]
}
```

## File Structure

### Models
- **`src/app/models/custom-order-forms.model.ts`** - Complete TypeScript interfaces for the JSON structure
- **`src/app/models/order-form.model.ts`** - Legacy order form models (maintained for compatibility)

### Services
- **`src/app/services/custom-order-forms.service.ts`** - Main service for CRUD operations
- **`src/app/services/form-service-junction.service.ts`** - Service for managing form-service associations

### Components
- **`src/app/order-forms/order-forms-enhanced.ts`** - Enhanced component with form builder
- **`src/app/order-forms/order-forms-builder.html`** - Form builder UI template
- **`src/app/order-forms/order-forms.ts`** - Original component (maintained)
- **`src/app/order-forms/order-forms.html`** - Original template (maintained)

## Usage

### Creating a New Form

1. Navigate to `/business/forms/create`
2. Choose from templates or start blank
3. Add components from the component library
4. Configure component properties
5. Set form settings (theme, notifications, etc.)
6. Associate with business services
7. Save and publish

### Editing an Existing Form

1. Navigate to `/business/forms/{formId}?edit=true`
2. Modify components and settings
3. Preview changes in real-time
4. Save updates

### Form Builder Features

#### Component Library
- Organized by categories (Basic Input, Selection, Date & Time, etc.)
- Drag-and-drop or click to add components
- Real-time component metadata and descriptions

#### Properties Panel
- Configure component labels, placeholders, validation
- Set required fields
- Manage options for selection components
- Advanced styling options

#### Preview Mode
- Toggle between edit and preview modes
- See exactly how customers will interact with the form
- Test form flow and usability

#### Form Settings
- Basic settings (name, description, theme)
- Submission settings (multiple submissions, authentication)
- Email notifications configuration
- Custom success messages

### Service Junction Management

Associate forms with specific business services:

```typescript
// Associate a form with multiple services
formServiceJunctionService.associateFormWithServices(
  businessId, 
  formId, 
  ['service-001', 'service-002']
);

// Get all services associated with a form
formServiceJunctionService.getFormServices(businessId, formId);

// Get all forms associated with a service
formServiceJunctionService.getServiceForms(businessId, serviceId);
```

## API Endpoints

### Form Management
- `GET /api/custom-order-forms/{businessId}` - Get all forms for business
- `POST /api/custom-order-forms/{businessId}/forms` - Create new form
- `PUT /api/custom-order-forms/{businessId}/forms/{formId}` - Update form
- `DELETE /api/custom-order-forms/{businessId}/forms/{formId}` - Delete form

### Component Management
- `POST /api/custom-order-forms/{businessId}/forms/{formId}/components` - Add component
- `PUT /api/custom-order-forms/{businessId}/forms/{formId}/components/{componentId}` - Update component
- `DELETE /api/custom-order-forms/{businessId}/forms/{formId}/components/{componentId}` - Remove component

### Service Junction
- `PUT /api/custom-order-forms/{businessId}/forms/{formId}/services` - Update form-service associations
- `GET /api/custom-order-forms/{businessId}/forms/{formId}/services` - Get form services
- `GET /api/form-service-junction/{businessId}/services` - Get all business services

### Templates
- `GET /api/custom-order-forms/templates` - Get available templates
- `POST /api/custom-order-forms/{businessId}/forms/from-template/{templateId}` - Create from template

## Component Types Reference

### CustomFormComponentType Enum

```typescript
enum CustomFormComponentType {
  // Basic input types
  TEXT = 'text',
  EMAIL = 'email', 
  PHONE = 'phone',
  NUMBER = 'number',
  TEXTAREA = 'textarea',
  PASSWORD = 'password',
  
  // Selection types
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect', 
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  CHECKBOX_GROUP = 'checkbox_group',
  
  // Date and time types  
  CALENDAR = 'calendar',
  CALENDAR_RANGE = 'calendar_range', // ⭐ New!
  TIME = 'time',
  DATETIME = 'datetime',
  
  // File upload
  FILE = 'file',
  IMAGE = 'image',
  
  // Advanced types
  RATING = 'rating',
  SLIDER = 'slider', 
  SIGNATURE = 'signature',
  LOCATION = 'location',
  
  // Display types
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  DIVIDER = 'divider',
  IMAGE_DISPLAY = 'image_display'
}
```

## Validation and Error Handling

### Form-Level Validation
- Form name required
- At least one component required
- Valid component configurations

### Component-Level Validation  
- Required field validation
- Type-specific validation (email format, phone format, etc.)
- Custom validation patterns
- Min/max length and value constraints

### Real-Time Validation
- Validation errors displayed in real-time
- Prevents saving forms with critical errors
- Warning messages for non-critical issues

## Themes and Styling

### Available Themes
- **Default** - Clean, professional look
- **Modern** - Contemporary design with gradients
- **Minimal** - Clean, simple interface
- **Corporate** - Professional business theme
- **Creative** - Colorful, engaging design
- **Bootstrap** - Bootstrap-styled components
- **Material** - Material Design components

### Custom Styling
Each component supports:
- Custom CSS classes
- Inline styling options
- Width/height customization
- Color customization (background, border, text)

## Advanced Features

### Conditional Logic
Show/hide components based on other field values:

```typescript
component.conditionalLogic = {
  showIf: [
    {
      fieldId: 'order_type',
      operator: 'equals',
      value: 'delivery'
    }
  ]
};
```

### Form Analytics
Track form performance:
- Total views and submissions
- Conversion rates
- Drop-off points
- Average completion time
- Field popularity metrics

### Import/Export
- Export forms as JSON
- Import forms from JSON
- Bulk operations support
- Template sharing between businesses

## Integration Points

### Business Services Integration
Forms can be associated with specific business services, allowing:
- Service-specific order forms
- Targeted form deployment
- Service analytics and reporting

### Payment Integration
Ready for integration with:
- Stripe payment processing
- Order management systems
- Inventory management
- Customer management systems

## Security Features

### Authentication
- Optional user authentication for forms
- Business owner authentication for management
- Role-based access control

### Data Protection
- Input sanitization
- SQL injection prevention (JSONB storage)
- XSS protection
- CSRF protection

### Privacy Compliance
- GDPR compliance features
- Data retention policies
- User consent management
- Data export/deletion tools

## Performance Considerations

### Database Optimization
- JSONB indexing for fast queries
- Efficient form loading with pagination
- Caching strategies for frequently accessed forms

### Frontend Optimization  
- Lazy loading of components
- Virtual scrolling for large forms
- Progressive form loading
- Optimized bundle sizes

## Development and Testing

### Component Testing
Each form component includes:
- Unit tests for functionality
- Integration tests for interactions
- Visual regression tests
- Accessibility tests

### API Testing
- Comprehensive API endpoint testing
- Load testing for high-traffic scenarios
- Security penetration testing
- Data integrity validation

## Future Enhancements

### Planned Features
- **Workflow Integration** - Multi-step forms with approval processes
- **Advanced Analytics** - Detailed reporting and insights
- **Mobile App Support** - Native mobile form rendering
- **Third-Party Integrations** - CRM, ERP, and marketing tool connections
- **AI-Powered Suggestions** - Smart component recommendations
- **Multi-Language Support** - Internationalization features

### Extensibility
The system is designed for easy extension:
- Plugin architecture for custom components
- Webhook support for external integrations  
- Custom validation rule engine
- Theme development framework

## Support and Documentation

### Getting Started
1. Review this documentation
2. Check the component examples
3. Use provided templates as starting points
4. Test in a development environment

### Best Practices
- Start with templates when possible
- Keep forms concise and user-friendly
- Test forms thoroughly before publishing
- Monitor analytics for optimization opportunities
- Regular backup of form configurations

### Troubleshooting
- Check browser console for errors
- Validate JSON structure for imports
- Ensure proper service associations
- Verify authentication and permissions

This system provides a complete, enterprise-ready solution for custom order forms with the flexibility to grow with your business needs.