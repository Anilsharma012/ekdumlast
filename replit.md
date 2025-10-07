# Overview

A production-ready full-stack property management application built with React and Express, designed for property listings, chat functionality, and comprehensive user management. The platform supports buyers, sellers, agents, and administrators with role-based access control, real-time messaging, and advanced property search capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for type safety and modern React features
- **React Router 6** in SPA mode for client-side routing with dynamic page handling
- **Vite** as the build tool for fast development and optimized production builds
- **TailwindCSS 3** with Radix UI components for consistent design system
- **Tanstack Query** for server state management and caching
- Component-based architecture with reusable UI components in `/client/components/ui/`
- Responsive design with mobile-first approach

## Backend Architecture
- **Express.js** server integrated with Vite development server
- **RESTful API** design with role-based authentication middleware
- **JWT authentication** for secure user sessions
- **File upload** handling with Multer for property images and documents
- **Socket.io** integration for real-time chat functionality
- **WebSocket** support for live notifications and messaging

## Database Design
- **MongoDB** as the primary database with collections for:
  - Properties with approval workflows and premium listings
  - Users with role-based access (buyer/seller/agent/admin)
  - Categories and subcategories for property classification
  - Conversations and messages for chat system
  - Banners and advertisements for content management
  - Notifications for user engagement

## Authentication & Authorization
- **JWT-based authentication** with role-specific access controls
- **Firebase Authentication** integration for enhanced security
- **Admin middleware** for protected administrative endpoints
- **Token-based API** authentication for secure operations

## Real-time Features
- **Socket.io** for instant messaging between users
- **WebSocket connections** for live notifications
- **Real-time property updates** and status changes
- **Live chat system** with typing indicators and message delivery

## Content Management
- **Dynamic banner system** with admin controls
- **Category management** with hierarchical organization
- **Property approval workflow** with admin oversight
- **User notification system** for engagement

# External Dependencies

## Core Technologies
- **Node.js/Express** - Server runtime and web framework
- **React/TypeScript** - Frontend framework with type safety
- **MongoDB** - Primary database for all application data
- **Socket.io** - Real-time bidirectional communication

## Authentication Services
- **Firebase Admin SDK** - Enhanced authentication and push notifications
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing and security

## File Management
- **Multer** - File upload handling for property images
- **Express static** - Serving uploaded media files

## Email & SMS Services
- **Nodemailer** - Email notifications and communication
- **Twilio** - SMS notifications and OTP verification

## Frontend Libraries
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon system
- **React Router** - Client-side routing
- **Tanstack Query** - Server state management
- **React Hook Form** - Form handling and validation

## Development Tools
- **Vite** - Build tool and development server
- **Vitest** - Testing framework
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety across the application

## Production Infrastructure
- **Environment variables** for configuration management
- **CORS configuration** for cross-origin requests
- **Production build** optimization with code splitting
- **Static file serving** for efficient asset delivery