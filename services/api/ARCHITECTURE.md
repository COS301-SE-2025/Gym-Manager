# Layered Architecture Documentation

## Overview

This project follows a **Clean Architecture** pattern with clear separation of concerns across multiple layers. Each layer has a specific responsibility and communicates only with adjacent layers.

## Architecture Layers

### 1. Presentation Layer (`/presentation`)
**Responsibility**: HTTP routing and request handling
- **Purpose**: Routes incoming HTTP requests to appropriate controllers
- **Components**: Route classes that define endpoints and middleware
- **Dependencies**: Controllers only
- **Example**: `AuthRoutes` - handles `/auth/*` endpoints

### 2. Controller Layer (`/controllers`)
**Responsibility**: HTTP request/response handling
- **Purpose**: Validates input, calls business services, formats responses
- **Components**: Controller classes that handle specific HTTP concerns
- **Dependencies**: Services only
- **Example**: `AuthController` - handles auth-related HTTP operations

### 3. Service Layer (`/services`)
**Responsibility**: Business logic and orchestration
- **Purpose**: Contains all business rules, validation, and workflow orchestration
- **Components**: Service classes that implement business operations
- **Dependencies**: Repositories and infrastructure services
- **Example**: `AuthService` - handles user registration, login, and status logic

### 4. Repository Layer (`/repositories`)
**Responsibility**: Data access and persistence
- **Purpose**: Abstracts database operations and data mapping
- **Components**: Repository classes that handle data operations
- **Dependencies**: Domain entities and database infrastructure
- **Example**: `UserRepository` - handles all user-related database operations

### 5. Infrastructure Layer (`/infrastructure`)
**Responsibility**: External concerns and technical implementation
- **Purpose**: Handles external services, database connections, security, etc.
- **Components**: Database clients, JWT services, password services, middleware
- **Dependencies**: External libraries and services
- **Example**: `JwtService`, `PasswordService`, `AuthMiddleware`

### 6. Domain Layer (`/domain`)
**Responsibility**: Core business entities and contracts
- **Purpose**: Defines business entities, interfaces, and data transfer objects
- **Components**: Entities, interfaces, DTOs
- **Dependencies**: None (pure business logic)
- **Example**: `User` entity, `IAuthService` interface

## Dependency Flow

```
Presentation → Controller → Service → Repository → Infrastructure
     ↓              ↓           ↓           ↓           ↓
   Routes    HTTP Handling  Business    Data Access  External
```

## Key Principles

### 1. Dependency Inversion
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Abstractions don't depend on details

### 2. Single Responsibility
- Each class has one reason to change
- Clear separation of concerns
- Focused, cohesive components

### 3. Interface Segregation
- Clients depend only on interfaces they use
- Small, focused interfaces
- Easy to mock and test

### 4. Dependency Injection
- Dependencies are injected, not created
- Easy to swap implementations
- Better testability

## Example: Authentication Flow

### 1. Request Flow
```
HTTP Request → AuthRoutes → AuthController → AuthService → UserRepository → Database
```

### 2. Response Flow
```
Database → UserRepository → AuthService → AuthController → AuthRoutes → HTTP Response
```

### 3. Error Handling
- **Controller**: Handles HTTP-specific errors (400, 401, 500)
- **Service**: Throws business-specific exceptions
- **Repository**: Throws data access exceptions
- **Infrastructure**: Handles technical exceptions

## Benefits

### 1. Maintainability
- Clear separation of concerns
- Easy to locate and modify code
- Reduced coupling between components

### 2. Testability
- Each layer can be tested independently
- Easy to mock dependencies
- Clear test boundaries

### 3. Scalability
- Easy to add new features
- Simple to extend existing functionality
- Clear extension points

### 4. Flexibility
- Easy to swap implementations
- Technology-agnostic business logic
- Platform-independent domain

## File Structure

```
src/
├── presentation/          # Presentation Layer
│   └── auth/
│       └── authRoutes.ts
├── controllers/           # Controller Layer
│   └── auth/
│       └── authController.ts
├── services/             # Service Layer
│   └── auth/
│       └── authService.ts
├── repositories/         # Repository Layer
│   └── auth/
│       └── userRepository.ts
├── infrastructure/       # Infrastructure Layer
│   ├── database/
│   ├── auth/
│   ├── middleware/
│   └── container/
├── domain/              # Domain Layer
│   ├── entities/
│   ├── interfaces/
│   └── dto/
└── app.ts               # Application Entry Point
```

## Usage Example

```typescript
// Using the dependency container
import { DependencyContainer } from './infrastructure/container/dependencyContainer';

const container = DependencyContainer.getInstance();
const authService = container.getAuthService();
const authController = container.getAuthController();

// The container handles all dependency wiring automatically
```

## Testing Strategy

### Unit Tests
- **Services**: Test business logic with mocked repositories
- **Controllers**: Test HTTP handling with mocked services
- **Repositories**: Test data access with test database

### Integration Tests
- **End-to-end**: Test complete request flows
- **Database**: Test repository implementations
- **API**: Test HTTP endpoints

### Mocking Strategy
- Use interfaces for all dependencies
- Mock external services
- Use dependency injection for testability

## Migration Guide

To migrate existing code to this architecture:

1. **Extract Domain Entities**: Move business objects to `/domain/entities`
2. **Create Interfaces**: Define contracts in `/domain/interfaces`
3. **Refactor Services**: Move business logic to `/services`
4. **Update Controllers**: Make them HTTP-focused only
5. **Organize Repositories**: Move data access to `/repositories`
6. **Extract Infrastructure**: Move external concerns to `/infrastructure`
7. **Update Routes**: Use the new presentation layer structure
8. **Add Dependency Injection**: Wire everything together

This architecture provides a solid foundation for building maintainable, testable, and scalable applications.

## Implementation Status

The layered architecture has been fully implemented with all layers completed:

### ✅ Completed Components

#### 1. Repository Layer (FULLY IMPLEMENTED)
All repository implementations have been completed:
- ✅ `UserRepository` - User authentication and management data operations
- ✅ `ClassRepository` - Class and workout data operations  
- ✅ `AdminRepository` - Admin management data operations
- ✅ `LiveClassRepository` - Live class data operations
- ✅ `UserSettingsRepository` - User settings data operations
- ✅ `HealthRepository` - Health check data operations

#### 2. Service Layer (FULLY IMPLEMENTED)
All business logic services have been implemented:
- ✅ `AuthService` - Authentication business logic
- ✅ `ClassService` - Class management business logic
- ✅ `AdminService` - Admin operations business logic
- ✅ `LiveClassService` - Live class business logic
- ✅ `UserSettingsService` - User settings business logic
- ✅ `HealthService` - Health check business logic

#### 3. Controller Layer (FULLY IMPLEMENTED)
All HTTP controllers have been refactored:
- ✅ `AuthController` - Authentication HTTP handling
- ✅ `ClassController` - Class management HTTP handling
- ✅ `AdminController` - Admin operations HTTP handling
- ✅ `LiveClassController` - Live class HTTP handling
- ✅ `UserSettingsController` - User settings HTTP handling
- ✅ `HealthController` - Health check HTTP handling

#### 4. Presentation Layer (FULLY IMPLEMENTED)
All route definitions have been created:
- ✅ `AuthRoutes` - Authentication routes
- ✅ `ClassRoutes` - Class management routes
- ✅ `AdminRoutes` - Admin operation routes
- ✅ `LiveClassRoutes` - Live class routes
- ✅ `UserSettingsRoutes` - User settings routes
- ✅ `HealthRoutes` - Health check routes

#### 5. Domain Layer (FULLY IMPLEMENTED)
All domain entities and interfaces have been defined:
- ✅ User entities and interfaces
- ✅ Class entities and interfaces
- ✅ Admin entities and interfaces
- ✅ Live class entities and interfaces
- ✅ User settings entities and interfaces
- ✅ Health entities and interfaces

#### 6. Infrastructure Layer (FULLY IMPLEMENTED)
All infrastructure components have been implemented:
- ✅ `DependencyContainer` - Dependency injection container
- ✅ `JwtService` - JWT token management
- ✅ `PasswordService` - Password hashing and verification
- ✅ `AuthMiddleware` - Authentication middleware
- ✅ Database schema and relations

#### 7. Database Schema (UPDATED)
The database schema has been updated to include:
- ✅ Live class functionality tables (`class_sessions`, `live_progress`)
- ✅ All necessary relations and foreign keys
- ✅ Proper data types and constraints

### 🔄 Remaining Tasks

#### 1. Testing
Implement comprehensive unit tests for each layer:
- Unit tests for services with mocked repositories
- Unit tests for controllers with mocked services
- Integration tests for repositories
- End-to-end API tests

#### 2. Error Handling Enhancement
Implement consistent error handling across all layers:
- Custom error classes for business logic
- Standardized error responses
- Proper error logging and monitoring

#### 3. Documentation
Complete documentation:
- API documentation with OpenAPI/Swagger
- Code comments and JSDoc
- Deployment and setup guides

#### 4. Performance Optimization
Optimize the implementation:
- Database query optimization
- Caching strategies
- Connection pooling
- Response time monitoring

The layered architecture is now fully functional and ready for production use. All components follow the established patterns and principles, providing a solid foundation for future development and maintenance.
