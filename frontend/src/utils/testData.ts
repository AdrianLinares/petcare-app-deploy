import { User, Pet, Appointment } from '../types';

/**
 * Test Data Initialization Module
 * 
 * BEGINNER EXPLANATION:
 * This file creates fake (demo) data for testing and demonstrating the app.
 * It populates the app with sample users, pets, and appointments so you can
 * explore features without manually creating everything.
 * 
 * What Data Does It Create?
 * 1. Users:
 *    - 4 pet owners (Sarah, Michael, Emma, Demo Owner)
 *    - 3 veterinarians (Dr. Martinez, Dr. Thompson, Dr. Johnson)
 *    - 3 administrators (different access levels)
 * 
 * 2. Pets:
 *    - Dogs: Max, Rocky, Bella, Buddy
 *    - Cats: Luna, Whiskers
 *    - Each with realistic details (breed, age, vaccinations, etc.)
 * 
 * 3. Appointments:
 *    - Past appointments (completed/cancelled)
 *    - Future appointments (scheduled)
 *    - Realistic dates and times
 * 
 * Why Use Test Data?
 * - Quick setup for development
 * - Demo the app to stakeholders
 * - Test features without manual data entry
 * - Consistent data across team members
 * 
 * How It Works:
 * 1. Checks version - only initializes if data is outdated
 * 2. Clears old data to prevent conflicts
 * 3. Creates all test users, pets, appointments
 * 4. Stores in localStorage (simulating database)
 * 5. Marks as initialized with version number
 * 
 * IMPORTANT:
 * This is for DEVELOPMENT ONLY. In production:
 * - Use real database
 * - Users register themselves
 * - Remove or disable this initialization
 * 
 * Demo Credentials:
 * - Pet Owner: owner@petcare.com / owner123
 * - Veterinarian: vet@petcare.com / vet123
 * - Administrator: admin@petcare.com / adminpass123
 */

export const initializeTestData = () => {
  // Version tracking prevents re-initializing if data already exists
  // BEGINNER NOTE: Change version number when you update test data structure
  const currentVersion = '2024-12-17-v6';

  // Verificar si ya están inicializados
  if (localStorage.getItem('testDataInitialized') === currentVersion) {
    console.log('✅ Test data already initialized');
    return;
  }

  console.log('🔄 Initializing test data...');

  // Limpiar datos existentes para evitar conflictos
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('pets_') || key.startsWith('appointments_') || key.startsWith('user_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // === USUARIOS DE PRUEBA ===

  // Propietarios de mascotas
  const petOwners: User[] = [
    // NOTE: User objects follow the User interface (no gender field here)
    {
      id: 'user_001',
      email: 'sarah.johnson@email.com',
      password: 'password123',
      fullName: 'Sarah Johnson',
      phone: '+1 (555) 123-4567',
      userType: 'pet_owner',
      createdAt: '2024-01-15T10:00:00Z',
      address: '123 Oak Street, Los Angeles, CA 90001'
    },
    {
      id: 'user_002',
      email: 'michael.chen@email.com',
      password: 'password123',
      fullName: 'Michael Chen',
      phone: '+1 (555) 234-5678',
      userType: 'pet_owner',
      createdAt: '2024-02-10T14:30:00Z',
      address: '456 Pine Avenue, Beverly Hills, CA 90212'
    },
    {
      id: 'user_003',
      email: 'emma.rodriguez@email.com',
      password: 'password123',
      fullName: 'Emma Rodriguez',
      phone: '+1 (555) 345-6789',
      userType: 'pet_owner',
      createdAt: '2024-03-05T09:15:00Z',
      address: '789 Maple Drive, Santa Monica, CA 90401'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'owner@petcare.com',
      password: 'password123',
      fullName: 'John Smith',
      phone: '+1-555-0101',
      userType: 'pet_owner',
      createdAt: '2024-01-01T12:00:00Z',
      address: '123 Pet Street, Boston, MA 02101'
    }
  ];

  // Veterinarios
  const veterinarians: User[] = [
    {
      id: 'vet_001',
      email: 'dr.martinez@petcare.com',
      password: 'vetpass123',
      fullName: 'Dr. Maria Martinez',
      phone: '+1 (555) 456-7890',
      userType: 'veterinarian',
      createdAt: '2024-01-01T08:00:00Z',
      specialization: 'General Practice',
      licenseNumber: 'VET-CA-12345'
    },
    {
      id: 'vet_002',
      email: 'dr.thompson@petcare.com',
      password: 'vetpass123',
      fullName: 'Dr. James Thompson',
      phone: '+1 (555) 567-8901',
      userType: 'veterinarian',
      createdAt: '2024-01-01T08:00:00Z',
      specialization: 'Surgery & Emergency Care',
      licenseNumber: 'VET-CA-67890'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'vet@petcare.com',
      password: 'password123',
      fullName: 'Sarah Johnson',
      phone: '+1-555-0102',
      userType: 'veterinarian',
      createdAt: '2024-01-01T08:00:00Z',
      specialization: 'General Practice',
      licenseNumber: 'VET-CA-12345'
    }
  ];

  // Administradores
  const administrators: User[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'admin@petcare.com',
      password: 'password123',
      fullName: 'Admin User',
      phone: '+1-555-0103',
      userType: 'administrator',
      createdAt: '2024-01-01T00:00:00Z',
      accessLevel: 'elevated'
    },
    {
      id: 'admin_002',
      email: 'admin.elevated@petcare.com',
      password: 'adminpass123',
      fullName: 'Elevated Admin',
      phone: '+1 (555) 888-0000',
      userType: 'administrator',
      createdAt: '2024-01-01T00:00:00Z',
      accessLevel: 'elevated'
    },
    {
      id: 'admin_003',
      email: 'admin.standard@petcare.com',
      password: 'adminpass123',
      fullName: 'Standard Admin',
      phone: '+1 (555) 777-0000',
      userType: 'administrator',
      createdAt: '2024-01-01T00:00:00Z',
      accessLevel: 'standard'
    }
  ];

  // Guardar todos los usuarios
  const allUsers = [...petOwners, ...veterinarians, ...administrators];
  allUsers.forEach(user => {
    localStorage.setItem(`user_${user.email}`, JSON.stringify(user));
  });

  // === MASCOTAS DE PRUEBA ===

  // Mascotas de Sarah Johnson
  const sarahPets: Pet[] = [
    {
      id: 'pet_001',
      name: 'Max',
      species: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      weight: 30.5,
      color: 'Golden',
      gender: 'Male', // Capitalized to match Pet interface
      ownerId: 'sarah.johnson@email.com',
      conditions: '',
      notes: 'Very friendly and energetic. Loves swimming and playing fetch.',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'pet_002',
      name: 'Luna',
      species: 'cat',
      breed: 'Persian',
      age: 2,
      weight: 4.2,
      color: 'White',
      gender: 'Female', // Capitalized to match Pet interface
      ownerId: 'sarah.johnson@email.com',
      conditions: '',
      notes: 'Indoor cat, very calm and affectionate. Enjoys grooming sessions.',
      createdAt: '2024-01-20T10:00:00Z'
    }
  ];

  // Mascotas de Michael Chen
  const michaelPets: Pet[] = [
    {
      id: 'pet_003',
      name: 'Rocky',
      species: 'dog',
      breed: 'German Shepherd',
      age: 5,
      weight: 36.3,
      color: 'Black and Tan',
      gender: 'Male',
      ownerId: 'michael.chen@email.com',
      conditions: 'ACL recovery (post-surgery)',
      notes: 'Working dog background. Currently recovering from ACL surgery.',
      createdAt: '2024-02-10T14:30:00Z'
    }
  ];

  // Mascotas de Emma Rodriguez
  const emmaPets: Pet[] = [
    {
      id: 'pet_004',
      name: 'Bella',
      species: 'dog',
      breed: 'Labrador Mix',
      age: 1,
      weight: 15.9,
      color: 'Chocolate Brown',
      gender: 'Female',
      ownerId: 'emma.rodriguez@email.com',
      conditions: '',
      notes: 'Young energetic puppy. Still completing vaccination series.',
      createdAt: '2024-03-05T09:15:00Z'
    },
    {
      id: 'pet_005',
      name: 'Whiskers',
      species: 'cat',
      breed: 'Maine Coon',
      age: 4,
      weight: 6.8,
      color: 'Orange Tabby',
      gender: 'Male',
      ownerId: 'emma.rodriguez@email.com',
      conditions: '',
      notes: 'Large, gentle cat. Indoor/outdoor access.',
      createdAt: '2024-03-10T09:15:00Z'
    }
  ];

  // Mascotas del usuario demo
  const demoPets: Pet[] = [
    {
      id: 'pet_006',
      name: 'Buddy',
      species: 'dog',
      breed: 'Beagle',
      age: 6,
      weight: 13.6,
      color: 'Tricolor',
      gender: 'Male',
      ownerId: 'owner@petcare.com',
      conditions: 'Seasonal allergies, Hip dysplasia (mild)',
      notes: 'Friendly beagle with seasonal allergies.',
      createdAt: '2024-01-01T12:00:00Z'
    }
  ];

  // Guardar mascotas por propietario
  localStorage.setItem('pets_sarah.johnson@email.com', JSON.stringify(sarahPets));
  localStorage.setItem('pets_michael.chen@email.com', JSON.stringify(michaelPets));
  localStorage.setItem('pets_emma.rodriguez@email.com', JSON.stringify(emmaPets));
  localStorage.setItem('pets_owner@petcare.com', JSON.stringify(demoPets));

  // === CITAS DE PRUEBA ===

  // Generar fechas futuras y pasadas
  const today = new Date();
  const futureDate1 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 días
  const futureDate2 = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 días
  const pastDate1 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // -7 días
  const pastDate2 = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000); // -14 días

  // Citas de Sarah Johnson
  const sarahAppointments: Appointment[] = [
    {
      id: 'apt_001',
      petId: 'pet_001',
      petName: 'Max',
      ownerId: 'sarah.johnson@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'checkup',
      date: futureDate1.toISOString(),
      time: '10:00',
      reason: 'Annual wellness exam and vaccination updates',
      notes: 'Check hip dysplasia progression',
      status: 'scheduled',
      createdAt: '2024-12-10T09:00:00Z'
    },
    {
      id: 'apt_002',
      petId: 'pet_002',
      petName: 'Luna',
      ownerId: 'sarah.johnson@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'grooming',
      date: futureDate2.toISOString(),
      time: '14:00',
      reason: 'Professional grooming session',
      notes: 'Persian breed requires special grooming',
      status: 'scheduled',
      createdAt: '2024-12-12T14:00:00Z'
    },
    {
      id: 'apt_003',
      petId: 'pet_001',
      petName: 'Max',
      ownerId: 'sarah.johnson@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'vaccination',
      date: pastDate1.toISOString(),
      time: '11:00',
      reason: 'DHPP booster vaccination',
      notes: 'Vaccination completed successfully',
      status: 'completed',
      diagnosis: 'Healthy, vaccination administered',
      treatment: 'DHPP vaccination',
      createdAt: '2024-12-01T10:00:00Z'
    }
  ];

  // Citas de Michael Chen
  const michaelAppointments: Appointment[] = [
    {
      id: 'apt_004',
      petId: 'pet_003',
      petName: 'Rocky',
      ownerId: 'michael.chen@email.com',
      veterinarian: 'Dr. James Thompson',
      type: 'followup',
      date: futureDate1.toISOString(),
      time: '09:00',
      reason: 'Post-surgery ACL repair follow-up',
      notes: 'Check healing progress and adjust medication',
      status: 'scheduled',
      createdAt: '2024-12-10T08:00:00Z'
    },
    {
      id: 'apt_005',
      petId: 'pet_003',
      petName: 'Rocky',
      ownerId: 'michael.chen@email.com',
      veterinarian: 'Dr. James Thompson',
      type: 'surgery',
      date: pastDate2.toISOString(),
      time: '15:00',
      reason: 'ACL repair surgery',
      notes: 'Surgery completed successfully',
      status: 'completed',
      diagnosis: 'ACL rupture',
      treatment: 'Surgical repair of ACL',
      createdAt: '2024-11-15T15:00:00Z'
    }
  ];

  // Citas de Emma Rodriguez
  const emmaAppointments: Appointment[] = [
    {
      id: 'apt_006',
      petId: 'pet_004',
      petName: 'Bella',
      ownerId: 'emma.rodriguez@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'vaccination',
      date: futureDate1.toISOString(),
      time: '13:00',
      reason: 'Final puppy vaccination series',
      notes: 'Complete vaccination protocol',
      status: 'scheduled',
      createdAt: '2024-12-05T13:00:00Z'
    },
    {
      id: 'apt_007',
      petId: 'pet_005',
      petName: 'Whiskers',
      ownerId: 'emma.rodriguez@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'checkup',
      date: futureDate2.toISOString(),
      time: '16:00',
      reason: 'Annual wellness exam',
      notes: 'Check overall health and update vaccinations',
      status: 'scheduled',
      createdAt: '2024-12-14T16:00:00Z'
    },
    {
      id: 'apt_008',
      petId: 'pet_004',
      petName: 'Bella',
      ownerId: 'emma.rodriguez@email.com',
      veterinarian: 'Dr. Maria Martinez',
      type: 'checkup',
      date: pastDate1.toISOString(),
      time: '10:30',
      reason: 'Puppy wellness check',
      notes: 'Healthy development, weight on track',
      status: 'completed',
      diagnosis: 'Healthy puppy development',
      treatment: 'Routine examination',
      createdAt: '2024-12-01T10:30:00Z'
    }
  ];

  // Citas del usuario demo
  const demoAppointments: Appointment[] = [
    {
      id: 'apt_009',
      petId: 'pet_006',
      petName: 'Buddy',
      ownerId: 'owner@petcare.com',
      veterinarian: 'Dr. Sarah Johnson',
      type: 'consultation',
      date: futureDate1.toISOString(),
      time: '11:30',
      reason: 'Allergy consultation',
      notes: 'Discuss allergy management options',
      status: 'scheduled',
      createdAt: '2024-12-01T12:00:00Z'
    }
  ];

  // Guardar citas por propietario
  localStorage.setItem('appointments_sarah.johnson@email.com', JSON.stringify(sarahAppointments));
  localStorage.setItem('appointments_michael.chen@email.com', JSON.stringify(michaelAppointments));
  localStorage.setItem('appointments_emma.rodriguez@email.com', JSON.stringify(emmaAppointments));
  localStorage.setItem('appointments_owner@petcare.com', JSON.stringify(demoAppointments));

  // Marcar como inicializado
  localStorage.setItem('testDataInitialized', currentVersion);

  // Log de resumen
  console.log('✅ Test data initialized successfully!');
  console.log('📊 Summary:');
  console.log(`- Users: ${allUsers.length} (${petOwners.length} pet owners, ${veterinarians.length} veterinarians, ${administrators.length} administrators)`);
  console.log(`- Pets: ${sarahPets.length + michaelPets.length + emmaPets.length + demoPets.length}`);
  console.log(`- Appointments: ${sarahAppointments.length + michaelAppointments.length + emmaAppointments.length + demoAppointments.length}`);
  console.log('');
  console.log('🔑 Demo Credentials:');
  console.log('Pet Owners:');
  console.log('- sarah.johnson@email.com / password123');
  console.log('- michael.chen@email.com / password123');
  console.log('- emma.rodriguez@email.com / password123');
  console.log('- owner@petcare.com / owner123');
  console.log('');
  console.log('Veterinarians:');
  console.log('- dr.martinez@petcare.com / vetpass123');
  console.log('- dr.thompson@petcare.com / vetpass123');
  console.log('- vet@petcare.com / vet123');
  console.log('');
  console.log('Administrators:');
  console.log('- admin@petcare.com / adminpass123 (Super Admin)');
  console.log('- admin.elevated@petcare.com / adminpass123 (Elevated Admin)');
  console.log('- admin.standard@petcare.com / adminpass123 (Standard Admin)');
};

// Función para limpiar todos los datos de prueba
export const clearTestData = () => {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('pets_') ||
      key.startsWith('appointments_') ||
      key.startsWith('user_') ||
      key === 'testDataInitialized'
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('🗑️ Test data cleared');
};

// Función para verificar la integridad de los datos
export const verifyTestData = () => {
  const users = [];
  const pets = [];
  const appointments = [];

  // Contar usuarios
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('user_')) {
      users.push(key);
    } else if (key?.startsWith('pets_')) {
      pets.push(key);
    } else if (key?.startsWith('appointments_')) {
      appointments.push(key);
    }
  }

  console.log('🔍 Data verification:');
  console.log(`- User keys: ${users.length}`);
  console.log(`- Pet keys: ${pets.length}`);
  console.log(`- Appointment keys: ${appointments.length}`);
  console.log(`- Initialized: ${localStorage.getItem('testDataInitialized')}`);

  return {
    users: users.length,
    pets: pets.length,
    appointments: appointments.length,
    initialized: !!localStorage.getItem('testDataInitialized')
  };
};