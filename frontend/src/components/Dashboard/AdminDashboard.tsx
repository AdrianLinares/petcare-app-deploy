/**
 * AdminDashboard Component
 * 
 * BEGINNER EXPLANATION:
 * This is the main control panel for administrators. Think of it as the "command center"
 * where admins can oversee everything in the PetCare system.
 * 
 * Key Features:
 * 1. View all users (pet owners, veterinarians, other admins)
 * 2. Manage all appointments (view, update status, cancel)
 * 3. View all pets in the system
 * 4. Monitor system statistics (total users, appointments, etc.)
 * 5. Search and filter data across all entities
 * 
 * Architecture:
 * - Uses tabs to organize different views (Overview, Users, Appointments, Pets)
 * - Loads all data from backend APIs on mount
 * - Provides CRUD operations for managing system data
 * - Role-based: Only accessible to users with 'administrator' role
 * 
 * Data Flow:
 * User interacts → Component updates state → API call to backend → Refresh data → UI updates
 * 
 * @param {User} user - The currently logged-in administrator
 * @param {Function} onLogout - Callback function to handle user logout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Footer from '@/components/ui/footer';
import { Users, Calendar, FileText, TrendingUp, Bell, Search, Shield, Edit, Trash2, Eye, Filter, AlertTriangle, X } from 'lucide-react';
import NotificationBell from '../Notification/NotificationBell';
import LanguageSwitcher from '../LanguageSwitcher';
import { Appointment, User, Pet } from '../../types';
import UserManagementDialogs from '../Admin/UserManagementDialogs';
import { userAPI, petAPI, appointmentAPI } from '@/lib/api';
import { toast } from 'sonner';
import { translateAppointmentType, translateAppointmentStatus } from '@/i18n/appointment';
import { translateSpecies } from '@/i18n/pets';
import MedicalHistoryManagement from '../Medical/MedicalHistoryManagement';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { t } = useTranslation();
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // BEGINNER NOTE: State variables hold the data that powers the dashboard.
  // When these change, React automatically re-renders the UI.

  // Data states - Store the actual data from the backend
  const [allUsers, setAllUsers] = useState<User[]>([]);                    // All users in the system
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]); // All appointments in the system
  const [allPets, setAllPets] = useState<Pet[]>([]);                       // All pets in the system

  // Search and filter states - Control what data is displayed
  const [searchTerm, setSearchTerm] = useState('');                        // Search text for user table
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');  // Search text for appointment table
  const [petSearchTerm, setPetSearchTerm] = useState('');                  // Search text for pet table
  const [statusFilter, setStatusFilter] = useState<string>('all');         // Filter appointments by status

  // Dialog states - Control which modal dialogs are open
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null); // Appointment being viewed/edited
  const [viewDialogOpen, setViewDialogOpen] = useState(false);             // Controls view appointment dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);         // Controls delete confirmation dialog
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);        // Pet being viewed for medical history

  // UI states - Control loading and interaction states
  const [isLoading, setIsLoading] = useState(false);                       // Shows loading spinner during API calls

  /**
   * Load Data Function
   * 
   * BEGINNER EXPLANATION:
   * This function fetches ALL data from the backend that the admin needs to see.
   * It's wrapped in useCallback so it doesn't get recreated on every render.
   * 
   * Why use Promise.all? We could load data one-by-one, but loading in parallel
   * (all at once) is much faster. Think of it like opening 3 browser tabs at once
   * instead of waiting for each page to load before opening the next one.
   * 
   * Flow:
   * 1. Set loading state to true (shows spinner)
   * 2. Call all three APIs simultaneously
   * 3. Update state with the results
   * 4. Handle any errors with user-friendly message
   * 5. Turn off loading state
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all users from backend (pet owners, vets, admins)
      const usersResult = await userAPI.listUsers();
      setAllUsers(usersResult.users || []);

      // Load all appointments from backend (all statuses)
      const appointments = await appointmentAPI.getAppointments();
      setAllAppointments(appointments);

      // Load all pets from backend (all owners)
      const pets = await petAPI.getPets();
      setAllPets(pets);
      setSelectedPet(prev => prev ? pets.find(p => p.id === prev.id) || prev : null);
    } catch (error: any) {
      console.error('Failed to load admin dashboard data:', error);
      toast.error(t('dashboard.failedLoadDashboard'));
    } finally {
      // Always turn off loading, even if there was an error
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter appointments based on search and status
  const filteredAppointments = allAppointments.filter(appointment => {
    const matchesSearch = appointmentSearchTerm === '' ||
      appointment.petName.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.veterinarian.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.type.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
      appointment.ownerId.toLowerCase().includes(appointmentSearchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setViewDialogOpen(true);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!selectedAppointment) return;

    setIsLoading(true);
    try {
      // Note: Backend doesn't have delete endpoint, so we mark as cancelled
      await appointmentAPI.updateAppointment(selectedAppointment.id, { status: 'cancelled' });

      // Reload data
      await loadData();

      toast.success(t('dashboard.appointmentCancelledSuccess'));
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.errorDeletingAppointment');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await appointmentAPI.updateAppointment(appointmentId, { status: newStatus });

      // Reload data
      await loadData();

      toast.success(t('dashboard.appointmentStatusUpdated', { status: newStatus }));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.errorUpdatingStatus');
      toast.error(message);
    }
  };
  const totalUsers = allUsers.length;
  const petOwners = allUsers.filter(u => u.userType === 'pet_owner').length;
  const veterinarians = allUsers.filter(u => u.userType === 'veterinarian').length;
  const totalAppointments = allAppointments.length;
  const completedAppointments = allAppointments.filter(apt => apt.status === 'completed').length;
  const cancelledAppointments = allAppointments.filter(apt => apt.status === 'cancelled').length;

  const today = new Date().toDateString();
  const todayAppointments = allAppointments.filter(apt =>
    new Date(apt.date).toDateString() === today
  ).length;

  const recentAppointments = [...allAppointments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const filteredUsers = allUsers.filter(u =>
    searchTerm === '' ||
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.userType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'pet_owner':
        return 'bg-blue-100 text-blue-800';
      case 'veterinarian':
        return 'bg-green-100 text-green-800';
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img
                  src="/petcare-logo.png"
                  alt="PetCare"
                  className="h-8 w-auto mr-3"
                />
                <Shield className="h-8 w-8 text-red-600 mr-2" />
                <h1 className="text-xl font-bold text-red-600">{t('dashboard.adminTitle')}</h1>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">{t('dashboard.administrator')}: {user.fullName}</h2>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <NotificationBell userId={user.id} />
              <Button variant="outline" onClick={onLogout}>
                {t('dashboard.signOut')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
            <TabsTrigger value="users">{t('dashboard.userManagement')}</TabsTrigger>
            <TabsTrigger value="appointments">{t('dashboard.appointments')}</TabsTrigger>
            <TabsTrigger value="medical">{t('dashboard.medicalHistory')}</TabsTrigger>
            <TabsTrigger value="reports">{t('dashboard.reports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.totalUsers')}</p>
                      <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.totalAppointments')}</p>
                      <p className="text-2xl font-bold text-gray-900">{totalAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.completed')}</p>
                      <p className="text-2xl font-bold text-gray-900">{completedAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.today')}</p>
                      <p className="text-2xl font-bold text-gray-900">{todayAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.userDistribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('dashboard.petOwners')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${totalUsers > 0 ? (petOwners / totalUsers) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{petOwners}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('dashboard.veterinarians')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${totalUsers > 0 ? (veterinarians / totalUsers) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{veterinarians}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.appointmentStatistics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('dashboard.completed')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{completedAppointments}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('dashboard.cancelled')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{cancelledAppointments}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentAppointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {recentAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {recentAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Calendar className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{appointment.petName}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.date).toLocaleDateString()} - Dr. {appointment.veterinarian}
                            </p>
                            <p className="text-sm text-gray-500">{translateAppointmentType(t, appointment.type)}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(appointment.status)}>
                          {translateAppointmentStatus(t, appointment.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('dashboard.noRecentAppointments')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('dashboard.userManagement')}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t('dashboard.searchUsers')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UserManagementDialogs
                  users={filteredUsers}
                  onUsersChange={loadData}
                  currentUser={user}
                />
                {filteredUsers.length === 0 && (
                  <p className="text-gray-500 text-center py-8">{t('dashboard.noUsersFound')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('dashboard.medicalAppointmentsManagement')}</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('dashboard.searchAppointments')}
                        value={appointmentSearchTerm}
                        onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder={t('dashboard.filterByStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('dashboard.allStatusFilter')}</SelectItem>
                          <SelectItem value="scheduled">{t('dashboard.scheduled')}</SelectItem>
                          <SelectItem value="completed">{t('dashboard.completed')}</SelectItem>
                          <SelectItem value="cancelled">{t('dashboard.cancelled')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-sm text-gray-600">
                  {t('dashboard.showingAppointments', { filtered: filteredAppointments.length, total: allAppointments.length })}
                </div>
                {filteredAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {filteredAppointments
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium">{appointment.petName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                              </p>
                              <p className="text-sm text-gray-600">Dr. {appointment.veterinarian}</p>
                              <p className="text-sm text-gray-500">{translateAppointmentType(t, appointment.type)}</p>
                              <p className="text-xs text-gray-400">{t('dashboard.owner')}: {appointment.ownerId}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {translateAppointmentStatus(t, appointment.status)}
                            </Badge>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAppointment(appointment)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {appointment.status === 'scheduled' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                                    className="text-green-600 hover:text-green-700"
                                    title="Mark as completed"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                                    className="text-yellow-600 hover:text-yellow-700"
                                    title="Cancel appointment"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAppointment(appointment)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete appointment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noAppointmentsFound')}</h3>
                    <p className="text-gray-600">
                      {appointmentSearchTerm || statusFilter !== 'all'
                        ? t('dashboard.tryAdjustingFilters')
                        : t('dashboard.noAppointmentsScheduled')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="space-y-6">
            {selectedPet ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPet(null)}
                  className="mb-4"
                >
                  {t('dashboard.backToPetList')}
                </Button>
                <MedicalHistoryManagement
                  pet={selectedPet}
                  onUpdate={loadData}
                  canEdit={true}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{t('dashboard.petMedicalHistoryManagement')}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('dashboard.searchPetsBy')}
                        value={petSearchTerm}
                        onChange={(e) => setPetSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const filteredPets = allPets.filter(pet =>
                      pet.name.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
                      pet.species.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
                      pet.breed.toLowerCase().includes(petSearchTerm.toLowerCase()) ||
                      pet.ownerId.toLowerCase().includes(petSearchTerm.toLowerCase())
                    );

                    return filteredPets.length > 0 ? (
                      <div>
                        <div className="mb-4 text-sm text-gray-600">
                          {t('dashboard.showingPets', { filtered: filteredPets.length, total: allPets.length })}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredPets.map((pet) => (
                            <Card
                              key={pet.id}
                              className="cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => setSelectedPet(pet)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg">{pet.name}</h3>
                                  <Badge variant="secondary">{translateSpecies(t, pet.species)}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{t('dashboard.breed')}: {pet.breed}</p>
                                <p className="text-sm text-gray-600">{t('dashboard.age')}: {pet.age} years</p>
                                <p className="text-sm text-gray-600">{t('dashboard.weight')}: {pet.weight} kg</p>
                                <p className="text-xs text-gray-500 mt-2">{t('dashboard.owner')}: {pet.ownerId}</p>
                                <div className="mt-3 flex gap-2 flex-wrap">
                                  {pet.medicalHistory && pet.medicalHistory.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="h-3 w-3 mr-1" />
                                      {t('dashboard.recordsCount', { count: pet.medicalHistory.length })}
                                    </Badge>
                                  )}
                                  {pet.vaccinations && pet.vaccinations.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {t('dashboard.vaccinesCount', { count: pet.vaccinations.length })}
                                    </Badge>
                                  )}
                                  {pet.medications && pet.medications.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {t('dashboard.medsCount', { count: pet.medications.length })}
                                    </Badge>
                                  )}
                                  {pet.allergies && pet.allergies.length > 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {t('dashboard.allergiesCount', { count: pet.allergies.length })}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noPetsFound')}</h3>
                        <p className="text-gray-600">
                          {petSearchTerm
                            ? t('dashboard.tryAdjustingSearch')
                            : t('dashboard.noPetsRegistered')}
                        </p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.systemSummary')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>{t('dashboard.totalUsersLabel')}</span>
                      <span className="font-bold">{totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.petOwnersLabel')}</span>
                      <span className="font-bold">{petOwners}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.veterinariansLabel')}</span>
                      <span className="font-bold">{veterinarians}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.totalAppointmentsLabel')}</span>
                      <span className="font-bold">{totalAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.completedAppointmentsLabel')}</span>
                      <span className="font-bold text-green-600">{completedAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.cancelledAppointmentsLabel')}</span>
                      <span className="font-bold text-red-600">{cancelledAppointments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.performanceMetrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>{t('dashboard.completionRate')}:</span>
                      <span className="font-bold">
                        {totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.cancellationRate')}:</span>
                      <span className="font-bold">
                        {totalAppointments > 0 ? Math.round((cancelledAppointments / totalAppointments) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.todaysAppointments')}:</span>
                      <span className="font-bold">{todayAppointments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.averagePetsPerOwner')}:</span>
                      <span className="font-bold">
                        {petOwners > 0 ? Math.round((Object.keys(localStorage).filter(key => key.startsWith('pets_')).length / petOwners) * 10) / 10 : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Appointment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dashboard.appointmentDetails')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.completeAppointmentInfo')}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.patient')}</h4>
                  <p className="font-medium">{selectedAppointment.petName}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.owner')}</h4>
                  <p>{selectedAppointment.ownerId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Date & Time</h4>
                  <p>{new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.doctorPrefix', { name: selectedAppointment.veterinarian })}</h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.type')}</h4>
                  <p>{translateAppointmentType(t, selectedAppointment.type)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">Status</h4>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {translateAppointmentStatus(t, selectedAppointment.status)}
                  </Badge>
                </div>
              </div>

              {selectedAppointment.reason && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.reasonForVisit')}</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedAppointment.reason}</p>
                </div>
              )}

              {selectedAppointment.diagnosis && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.diagnosis')}</h4>
                  <p className="text-sm bg-green-50 p-3 rounded">{selectedAppointment.diagnosis}</p>
                </div>
              )}

              {selectedAppointment.treatment && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.treatment')}</h4>
                  <p className="text-sm bg-blue-50 p-3 rounded">{selectedAppointment.treatment}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-600">{t('dashboard.additionalNotes')}</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-4 border-t">
                {t('dashboard.appointmentDate')}: {new Date(selectedAppointment.createdAt).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Appointment Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>{t('dashboard.deleteAppointment')}</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.confirmDeleteAppointmentDesc')}
              {selectedAppointment && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{selectedAppointment.petName}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedAppointment.date).toLocaleDateString()} at {selectedAppointment.time}
                  </p>
                  <p className="text-sm text-gray-600">Dr. {selectedAppointment.veterinarian}</p>
                  <p className="text-sm text-gray-500">{translateAppointmentType(t, selectedAppointment.type)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAppointment}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? t('dashboard.deleting') : t('dashboard.deleteAppointmentBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
