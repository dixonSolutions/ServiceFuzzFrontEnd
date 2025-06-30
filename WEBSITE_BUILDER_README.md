# Website Builder - ServiceFuzz

A comprehensive drag-and-drop website builder built with Angular and PrimeNG, designed for creating modern, responsive websites.

## Features

### 🎨 Visual Website Builder
- **Drag & Drop Interface**: Intuitive component-based design
- **Real-time Preview**: See changes instantly as you build
- **Device Responsive**: Design for desktop, tablet, and mobile simultaneously
- **Component Library**: Pre-built components for common website elements

### 🧩 Available Components

#### Navigation Components
- **Header**: Website header with navigation menu
- **Footer**: Website footer with links and information

#### Content Components
- **Hero Section**: Eye-catching hero with headline and call-to-action
- **Text Block**: Simple text content with customizable styling
- **Card**: Content cards with title, content, and optional image

#### Media Components
- **Image**: Image component with caption and alt text

#### Interactive Components
- **Button**: Interactive buttons with customizable styling

### 🛠️ Component Properties

Each component supports customizable properties:

#### Text Properties
- **Text Input**: Editable text fields
- **Textarea**: Multi-line text content
- **Number Input**: Numeric values (width, height, font size)

#### Style Properties
- **Color Picker**: Background and text colors
- **Dropdown**: Predefined options (text alignment, button types)
- **Checkbox**: Boolean toggles (show/hide elements)

### 📱 Device Support

The website builder supports three device types:

1. **Desktop** (1200x800px)
2. **Tablet** (768x1024px)
3. **Mobile** (375x667px)

Each device has its own layout, allowing you to create responsive designs.

### 🎯 Key Features

#### Canvas Controls
- **Zoom In/Out**: Scale the canvas for detailed editing
- **Pan**: Navigate around the canvas
- **Reset View**: Return to default zoom and position

#### Component Management
- **Select Components**: Click to select and edit properties
- **Resize Components**: Drag resize handles to adjust size
- **Move Components**: Drag components to reposition
- **Delete Components**: Remove unwanted components

#### Project Management
- **New Project**: Start fresh with a new website
- **Export Project**: Save your project as JSON
- **Import Project**: Load previously saved projects

## How to Use

### Getting Started

1. **Navigate to Website Builder**: Click "Website Creator" in the navigation
2. **Create New Project**: Click "Project" → "New Project"
3. **Name Your Project**: Enter a project name and description
4. **Start Building**: Drag components from the sidebar to the canvas

### Adding Components

1. **Browse Components**: Components are organized by category in the sidebar
2. **Drag to Canvas**: Click and drag any component to the canvas
3. **Position**: Drop the component where you want it
4. **Customize**: Click the component to edit its properties

### Editing Components

1. **Select Component**: Click on any component on the canvas
2. **Properties Panel**: The right panel shows component properties
3. **Edit Properties**: Modify text, colors, sizes, and other settings
4. **Real-time Updates**: See changes immediately on the canvas

### Device Switching

1. **Device Selector**: Use the device buttons in the toolbar
2. **Responsive Design**: Each device maintains its own layout
3. **Cross-Device Editing**: Switch between devices to ensure responsive design

### Saving Your Work

1. **Export Project**: Click "Project" → "Export"
2. **Copy JSON**: Copy the generated JSON data
3. **Save Locally**: Save the JSON to a file
4. **Import Later**: Use "Project" → "Import" to load saved projects

## Technical Architecture

### Service Layer
- **WebsiteBuilderService**: Core service managing project state and components
- **Component Registry**: Centralized component definitions and parameters
- **State Management**: Reactive state using Angular signals

### Component System
- **ComponentDefinition**: Defines available components and their properties
- **ComponentInstance**: Runtime instances with position, size, and parameters
- **Parameter System**: Type-safe parameter definitions (text, number, color, etc.)

### Data Structure
```typescript
interface WebsiteProject {
  id: string;
  name: string;
  description: string;
  layouts: { [device: string]: WebsiteLayout };
  currentDevice: 'desktop' | 'tablet' | 'mobile';
  createdAt: Date;
  updatedAt: Date;
}
```

## Keyboard Shortcuts

- **Ctrl+S**: Save project (placeholder)
- **Ctrl+Z**: Undo (placeholder)
- **Ctrl+Y**: Redo (placeholder)
- **Delete/Backspace**: Delete selected component

## Future Enhancements

### Planned Features
- **Undo/Redo System**: Track changes and allow reverting
- **Component Templates**: Pre-built component combinations
- **Export to HTML/CSS**: Generate actual website files
- **Collaboration**: Real-time collaborative editing
- **Component Library**: More pre-built components
- **Custom CSS**: Advanced styling options
- **Asset Management**: Image and file upload system

### Advanced Features
- **Component Nesting**: Place components inside other components
- **Animation System**: Add motion and transitions
- **Form Builder**: Create interactive forms
- **E-commerce Components**: Shopping cart, product listings
- **SEO Tools**: Meta tags and optimization features

## Development

### Prerequisites
- Angular 17+
- PrimeNG
- Node.js 18+

### Installation
```bash
npm install
ng serve
```

### Building
```bash
ng build
```

### Testing
```bash
ng test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is part of the ServiceFuzz platform and follows the same licensing terms.

---

 