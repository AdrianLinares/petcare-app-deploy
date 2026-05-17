# 🏗️ PetCare Architecture Guide for Beginners

This document explains how the PetCare application is built and organized. It's written for people who are new to programming or just starting to learn.

---

## 📚 Table of Contents
1. [What is This Application?](#what-is-this-application)
2. [Technologies Used](#technologies-used)
3. [Project Structure](#project-structure)
4. [How Data Flows](#how-data-flows)
5. [Key Concepts](#key-concepts)

---

## What is This Application?

PetCare is a web application (runs in your browser) that helps manage:
- **Pets**: Keep track of your pets and their health information
- **Appointments**: Schedule vet visits
- **Medical Records**: Store vaccination, medication, and health history
- **Users**: Different types of users (pet owners, veterinarians, administrators)

Think of it like a digital filing cabinet for pet healthcare!

---

## Technologies Used

### **React** 🔵
- **What it is**: A JavaScript library for building user interfaces
- **Why we use it**: Makes it easy to create interactive web pages that update without reloading
- **Simple explanation**: React lets us break our page into small, reusable pieces called "components"

### **TypeScript** 💙
- **What it is**: JavaScript with extra type-checking features
- **Why we use it**: Helps catch mistakes before the code runs
- **Simple explanation**: It's like having a spell-checker for your code

### **Tailwind CSS** 🎨
- **What it is**: A styling framework
- **Why we use it**: Makes styling our pages faster and more consistent
- **Simple explanation**: Pre-made style classes we can apply to make things look nice

### **Vite** ⚡
- **What it is**: A build tool
- **Why we use it**: Makes development faster
- **Simple explanation**: It's like a helper that runs your code in the browser during development

### **Neon PostgreSQL** 🐘
- **What it is**: A serverless PostgreSQL database
- **Why we use it**: Automatic scaling, high availability, and modern developer experience
- **Simple explanation**: Like a super organized filing cabinet in the cloud that scales automatically

### **Netlify Serverless Functions** ☁️
- **What it is**: Server-side code that runs on-demand without managing servers
- **Why we use it**: Handles API requests, talks to the database, and scales automatically
- **Simple explanation**: The middleman between the website and the database, but without needing to manage a server

### **JWT (JSON Web Tokens)** 🔐
- **What it is**: A secure way to authenticate users
- **Why we use it**: Keeps users logged in securely
- **Simple explanation**: Like a secure ID card that proves who you are

---

## Project Structure

Here's how the folders and files are organized:

```
petcare-app/
├── frontend/                     # Frontend React application
│   ├── src/
│   │   ├── components/           # Reusable UI pieces
│   │   │   ├── ui/               # Basic UI components (buttons, cards, etc.)
│   │   │   ├── Auth/             # Login and password components
│   │   │   ├── Dashboard/        # Main pages for each user type
│   │   │   ├── Pet/              # Pet management features
│   │   │   ├── Appointment/      # Appointment scheduling features
│   │   │   └── Medical/          # Medical record features
│   │   │
│   │   ├── lib/                  # External integrations
│   │   │   ├── api.ts            # API client (Axios)
│   │   │   └── utils.ts          # General utilities
│   │   │
│   │   ├── utils/                # Helper functions
│   │   │   ├── roleManagement.ts # Who can do what (permissions)
│   │   │   ├── passwordRecovery.ts # Password reset logic
│   │   │   └── testData.ts      # Demo data for testing
│   │   │
│   │   ├── types.ts              # TypeScript type definitions
│   │   ├── App.tsx               # Main application component
│   │   └── main.tsx              # Entry point (starts everything)
│   │
│   └── package.json              # Frontend dependencies
│
├── netlify/                      # Serverless backend
│   └── functions/                # Serverless API functions
│       ├── auth.ts               # Authentication endpoints
│       ├── users.ts              # User management
│       ├── pets.ts               # Pet endpoints
│       ├── appointments.ts       # Appointment management
│       ├── medical-records.ts
│       ├── medications.ts
│       ├── vaccinations.ts
│       ├── clinical-records.ts
│       ├── notifications.ts
│       └── utils/                # Shared utilities
│           ├── auth.ts           # JWT validation
│           ├── database.ts       # Neon connection
│           └── response.ts       # Response helpers
│
└── README.md                     # Project documentation
```

### **What Each Folder Does**

#### `components/` - The Building Blocks
Components are like LEGO pieces. Each piece does one thing, and you combine them to build the full application.

**Example**: A `Button` component can be reused everywhere you need a button.

#### `lib/` - API Client
The API client handles all communication with the backend server. It's like a translator between the frontend and backend.

**Example**: When you want to add a new pet, the `petAPI` sends a request to the backend server.

#### `utils/` - Helper Functions
Utilities are small helper functions that do specific tasks.

**Example**: `passwordRecovery.ts` has functions to create password reset tokens.

---

## How Data Flows

Let's follow what happens when a user logs in:

```
1. User enters email and password
   ↓
2. LoginForm component validates the input
   ↓
3. Frontend sends credentials to Netlify serverless function
   ↓
4. Serverless function checks Neon PostgreSQL database for the user
   ↓
5. If correct, function creates a JWT token
   ↓
6. Frontend receives token and user data
   ↓
7. Token is saved to localStorage for future requests
   ↓
8. App.tsx saves user data to "state"
   ↓
9. React re-renders and shows the dashboard
   ↓
10. Dashboard makes API calls to serverless functions
    ↓
11. Functions fetch data from Neon database and return it
    ↓
12. Frontend displays the data
```

### **Frontend ↔️ Serverless API Communication**

Every time the frontend needs data:
1. **Frontend** makes an HTTP request (using Axios)
2. **Request includes** the JWT token for authentication
3. **Serverless function** validates the token
4. **Function** queries the Neon PostgreSQL database
5. **Function** sends data back as JSON
6. **Frontend** receives and displays the data

### **What is "State"?**
State is like the application's memory. It remembers things while the app is running.

**Example**: When you log in, the app remembers "currentUser" in its state.

---

## Component Hierarchy & Interaction

Understanding how components connect is key to reading the code. Here's how they interact:

### **Parent → Child Communication (Props)**

Data flows DOWN from parent to child via **props**:

```
App.tsx                         ← Parent (owns currentUser state)
├── LoginForm                   ← Child — receives onLoginSuccess callback
│   └── Input, Button           ← UI primitives (receive value, onChange)
│
└── PetOwnerDashboard           ← Child — receives user object as prop
    ├── NotificationBell         ← Child — receives userId
    ├── LanguageSwitcher         ← Child — standalone
    └── [Feature Components]     ← PetManagement, AppointmentScheduling, etc.
```

**How it works in code:**
```tsx
// Parent (App.tsx) passes data DOWN
<PetOwnerDashboard
  user={currentUser}         // prop: user data
  onLogout={handleLogout}    // prop: callback function
/>

// Child (PetOwnerDashboard) receives props
function PetOwnerDashboard({ user, onLogout }: {
  user: User;
  onLogout: () => void;
}) {
  // Use user.fullName, user.id, etc.
  // Call onLogout() when user clicks "Sign Out"
}
```

### **Child → Parent Communication (Callbacks)**

Data flows UP via **callback functions** passed as props:

```
User clicks "Schedule" in AppointmentScheduling
  → calls onCreateAppointment(data)     ← callback UP
  → PetOwnerDashboard receives the data
  → setsAppointments([...prev, newAppt])  ← state update
  → React re-renders UI
```

### **Sibling Communication**

Sibling components don't talk directly. They communicate through their **common parent**:

```
App.tsx                    ← shared state lives here
├── LoginForm              ← sets currentUser via onLoginSuccess
└── PetOwnerDashboard      ← reads currentUser from props
```

When `LoginForm` calls `onLoginSuccess(user)`, `App.tsx` updates `currentUser`, which causes `PetOwnerDashboard` to render.

### **Service Layer Communication**

Components don't talk to the database directly. They go through the **API service layer**:

```
Component → petAPI.getPets() → Axios HTTP call → Serverless Function → PostgreSQL
     ↑                                                                       │
     └──────────────────── JSON response ←───────────────────────────────────┘
```

---

## Global State Glossary

These are the **shared state variables** that multiple parts of the app depend on. Knowing them helps you trace how data flows through the application.

| State Variable | Location | Type | Purpose | Updated By |
|---------------|----------|------|---------|------------|
| `currentUser` | `App.tsx:72` | `User \| null` | Who is logged in (`null` = not authenticated) | `handleLoginSuccess()`, `handleLogout()`, `checkAuth()` |
| `loading` | `App.tsx:79` | `boolean` | Is the app still initializing? | `useEffect` on mount, `setLoading(false)` at end |
| `authState` | `App.tsx:87` | `AuthState` | Which auth screen to show (login, forgot-password, reset-password) | URL hash changes, user actions |
| `pets` | Each dashboard | `Pet[]` | Current user's pets | `petAPI.getPets()` in `useEffect` |
| `appointments` | Each dashboard | `Appointment[]` | Current user's appointments | `appointmentAPI.getAppointments()` in `useEffect` |
| Token | `localStorage` | `string \| null` | JWT for API authentication | `authAPI.login()`, `authAPI.logout()` |

**Rule of thumb:** State that affects multiple components lives in `App.tsx` (or `localStorage`). State used by only one component lives in that component.

---

## Visual Consistency — How the Design Stays Consistent

The app uses a **design system** built on three layers:

### **Layer 1: Tailwind CSS Theme** (`tailwind.config.js`)

A shared theme file defines colors, spacing, and fonts used everywhere:

```js
// Simplified example — colors used throughout the app
theme: {
  extend: {
    colors: {
      'petcare-navy': '#1e3a5f',      // Headings, primary text
      'petcare-golden': '#c9a84c',    // Accents, highlights
      'petcare-beige': '#f5f0e8',     // Backgrounds
    }
  }
}
```

**Why this matters:** Changing `petcare-navy` in one file updates it everywhere. No more hunting down hardcoded colors.

### **Layer 2: Shared UI Components** (`src/components/ui/`)

These are **pre-built, reusable components** based on [shadcn/ui](https://ui.shadcn.com/):

| Component | Purpose | Used In |
|-----------|---------|---------|
| `Button` | All clickable actions | Every dashboard |
| `Card` | Content containers | Pet cards, appointment cards |
| `Dialog` | Popup forms | Schedule appointment, add pet |
| `Badge` | Status labels | Appointment status, allergies |
| `Input` | Text fields | All forms |
| `Table` | Data tables | Admin user list |
| `Toast` | Notification popups | Success/error messages |

**Example — every form dialog follows the same pattern:**

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Form fields */}
    <Button onClick={handleSave}>Save</Button>
  </DialogContent>
</Dialog>
```

This means users see **consistent layouts, spacing, and interactions** whether they're adding a pet, scheduling an appointment, or editing medical records.

### **Layer 3: Composition Patterns**

All feature pages follow the same layout pattern:

```
Card (container)
├── CardHeader (title + actions)
├── CardContent (main data)
│   ├── Data display (text, badges, images)
│   └── Action buttons (edit, delete, schedule)
└── CardFooter (optional: pagination, summary)
```

---

## Responsibility Matrix by Role

Each user role has specific permissions. This matrix shows exactly what each role can do:

| Feature | Pet Owner | Veterinarian | Standard Admin | Elevated Admin | Super Admin |
|---------|:---------:|:------------:|:--------------:|:--------------:|:-----------:|
| View own pets | ✅ | — | — | — | — |
| View all pets | — | ✅ | ✅ | ✅ | ✅ |
| Add/edit own pets | ✅ | — | — | — | — |
| Add/edit any pet | — | ✅ | ✅ | ✅ | ✅ |
| Delete pets | — | — | ✅ | ✅ | ✅ |
| View own appointments | ✅ | — | — | — | — |
| View all appointments | — | ✅ | ✅ | ✅ | ✅ |
| Schedule appointments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel appointments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Add medical records | — | ✅ | — | ✅ | ✅ |
| View medical records | Own pets | All pets | All pets | All pets | All pets |
| Manage users (CRUD) | — | — | Pet owners + Vets | All except admins | All users |
| Manage administrators | — | — | — | — | ✅ |
| Access admin dashboard | — | — | ✅ | ✅ | ✅ |
| System settings | — | — | — | ✅ | ✅ |
| View reports/analytics | — | ✅ | ✅ | ✅ | ✅ |

> **Source:** This matrix is implemented in [`frontend/src/utils/roleManagement.ts`](../frontend/src/utils/roleManagement.ts). The `getRolePermissions()` function returns the exact permissions for each role and access level.

---

## Key Concepts

### 1. **Components**
A component is a piece of UI that you can reuse.

**Think of it like**: A recipe. You write it once, use it many times.

```typescript
// Simple component example
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage:
<Welcome name="John" />  // Shows: Hello, John!
<Welcome name="Jane" />  // Shows: Hello, Jane!
```

### 2. **Props**
Props (properties) are how you pass data to components.

**Think of it like**: Function arguments or parameters.

```typescript
// Parent passes data to child
<PetCard 
  name="Buddy"          // prop
  species="Dog"         // prop
  age={3}              // prop
/>
```

### 3. **State**
State is data that can change over time.

**Think of it like**: A variable that causes the page to update when it changes.

```typescript
// Creating state
const [count, setCount] = useState(0);

// Reading state
console.log(count);  // 0

// Updating state (page will re-render)
setCount(5);  // Now count is 5
```

### 4. **Hooks**
Hooks are special functions that let you use React features.

Common hooks:
- `useState`: Remember data
- `useEffect`: Do something when the page loads or data changes
- `useCallback`: Remember a function

**Think of it like**: Special tools React gives you.

### 5. **TypeScript Interfaces**
Interfaces define the shape of data.

**Think of it like**: A form that data must fill out correctly.

```typescript
// Interface definition
interface Pet {
  name: string;      // Must be text
  age: number;       // Must be a number
  species: string;   // Must be text
}

// Valid pet
const myPet: Pet = {
  name: "Buddy",
  age: 3,
  species: "Dog"
};

// Invalid pet (TypeScript will warn you!)
const badPet: Pet = {
  name: "Fluffy",
  age: "three",  // ❌ Error: should be number!
  species: "Cat"
};
```

### 6. **Services**
Services are classes with methods for data operations.

**Think of it like**: A toolbox with specific tools.

```typescript
// Service example
class PetService {
  // Get all pets
  static getAllPets() {
    // ... code to fetch pets
  }
  
  // Add a new pet
  static addPet(pet) {
    // ... code to save pet
  }
}

// Using the service
const pets = PetService.getAllPets();
```

### 7. **localStorage**
Browser storage that persists data even after closing the browser.

**Think of it like**: Saving a file on your computer.

```typescript
// Save data
localStorage.setItem('myKey', 'myValue');

// Get data
const value = localStorage.getItem('myKey');

// Remove data
localStorage.removeItem('myKey');
```

### 8. **CRUD Operations**
CRUD = Create, Read, Update, Delete (the four basic operations on data)

**Think of it like**: 
- **Create**: Add a new pet
- **Read**: View pet list
- **Update**: Edit pet information
- **Delete**: Remove a pet

### 9. **Role-Based Access Control (RBAC)**
Different users have different permissions.

**Think of it like**: Keys to different rooms in a building.

- **Pet Owner**: Can only see their own pets
- **Veterinarian**: Can see all pets and add medical records
- **Administrator**: Can do everything, including managing users

---

## How to Read the Code

### Step 1: Start with `App.tsx`
This is the main component. It decides what to show based on whether someone is logged in.

### Step 2: Look at the Dashboards
- `PetOwnerDashboard.tsx`
- `VeterinarianDashboard.tsx`
- `AdminDashboard.tsx`

These show what each user type sees.

### Step 3: Explore the Services
Services show you how data is managed:
- `userService.ts`
- `petService.ts`
- `appointmentService.ts`

### Step 4: Check the Components
Individual features are in component files:
- `PetManagement.tsx`
- `AppointmentScheduling.tsx`
- `MedicalHistoryManagement.tsx`

---

## Common Patterns in This Project

### 1. **State Management Pattern**
```typescript
// Declare state
const [pets, setPets] = useState<Pet[]>([]);

// Load data when component mounts
useEffect(() => {
  const loadedPets = PetService.getPetsByOwner(userId);
  setPets(loadedPets);
}, [userId]);

// Update state
const addPet = (newPet: Pet) => {
  setPets([...pets, newPet]);
};
```

### 2. **Service Layer Pattern**
All data operations go through services, not directly in components.

**Why?** Makes code organized and reusable.

```typescript
// ❌ Bad: Direct localStorage in component
const pets = JSON.parse(localStorage.getItem('pets'));

// ✅ Good: Use service
const pets = PetService.getAllPets();
```

### 3. **Conditional Rendering**
Show different things based on conditions.

```typescript
{isLoggedIn ? (
  <Dashboard />        // Show if logged in
) : (
  <LoginForm />        // Show if not logged in
)}
```

### 4. **Event Handlers**
Functions that run when something happens (click, type, etc.)

```typescript
const handleLogin = (email: string, password: string) => {
  // Check credentials
  // Update state
  // Show dashboard
};

<button onClick={handleLogin}>Login</button>
```

---

## Glossary of Terms

- **Component**: A reusable piece of UI
- **Props**: Data passed to a component
- **State**: Data that can change and cause re-renders
- **Hook**: Special React function (useState, useEffect, etc.)
- **Interface**: TypeScript type definition
- **Service**: Class with methods for data operations
- **CRUD**: Create, Read, Update, Delete operations
- **localStorage**: Browser storage for data
- **RBAC**: Role-Based Access Control (permissions)

---

## Next Steps

1. Read the [02-BEGINNER_GUIDE.md](./02-BEGINNER_GUIDE.md) for a step-by-step walkthrough
2. Look at the inline comments in the code files
3. Try making small changes and see what happens
4. Use the browser's Developer Tools (F12) to see console logs and inspect elements

---

**Remember**: Programming is learned by doing! Don't be afraid to experiment and make mistakes. That's how you learn! 🚀
