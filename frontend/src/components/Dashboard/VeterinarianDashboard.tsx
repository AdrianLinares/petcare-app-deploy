/**
 * VeterinarianDashboard Component
 * 
 * BEGINNER EXPLANATION:
 * This is the main workspace for veterinarians. Think of it as their digital clinic
 * where they can see their schedule, manage appointments, and update medical records.
 * 
 * Key Features:
 * 1. Today's Schedule - See all appointments for today
 * 2. Upcoming Appointments - View future appointments
 * 3. All Appointments - Search and filter all appointments
 * 4. Pet Medical Records - View and update patient records
 * 5. Inline Editing - Update medical notes directly from appointment view
 * 
 * Architecture:
 * - Tab-based navigation (today, upcoming, all appointments, pets)
 * - Shows ONLY appointments assigned to this specific veterinarian
 * - Allows updating appointment status (complete, cancel, reschedule)
 * - Can add medical notes (diagnosis, treatment, follow-up) to appointments
 * 
 * Veterinarian Workflow:
 * 1. View today's appointments → Complete appointments → Add medical notes
 * 2. Reschedule appointments if needed
 * 3. Access pet medical history for context
 * 
 * @param {User} user - The currently logged-in veterinarian
 * @param {Function} onLogout - Callback function to handle user logout
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Footer from '@/components/ui/footer';
import { Calendar, Clock, Users, FileText, Bell, User as UserIcon, Edit, Save, X, Search, Filter, Trash2 } from 'lucide-react';
import NotificationBell from '../Notification/NotificationBell';
import LanguageSwitcher from '../LanguageSwitcher';
import { Appointment, User, Pet } from '../../types';
import { appointmentAPI, petAPI } from '@/lib/api';
import { toast } from 'sonner';
import { translateAppointmentType, translateAppointmentStatus } from '@/i18n/appointment';
import { translateSpecies } from '@/i18n/pets';
import { format } from 'date-fns';
import MedicalHistoryManagement from '../Medical/MedicalHistoryManagement';

interface VeterinarianDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function VeterinarianDashboard({ user, onLogout }: VeterinarianDashboardProps) {
  const { t } = useTranslation();
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // BEGINNER NOTE: State holds all the data and UI state for the veterinarian dashboard.
  // Each piece of state has a specific purpose in managing the vet's workflow.

  // Data states - Store appointments and pets data
  const [appointments, setAppointments] = useState<Appointment[]>([]); // All appointments for this vet
  const [allPets, setAllPets] = useState<Pet[]>([]);                  // All pets (for medical records view)

  // Navigation and selection states
  const [activeTab, setActiveTab] = useState('today');                // Which tab is currently active
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);   // Pet selected for medical records view

  // Editing states - Control which appointment is being edited and how
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);       // Appointment being edited for medical notes
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null); // Appointment being rescheduled

  // Form states - Hold temporary form data during editing
  const [medicalForm, setMedicalForm] = useState({
    diagnosis: '',      // Diagnosis entered by vet
    treatment: '',      // Treatment plan entered by vet
    notes: '',          // Additional notes from vet
    followUpDate: ''    // Date for follow-up appointment
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    date: new Date(),   // New appointment date
    time: ''            // New appointment time
  });

  // Search and filter states - Control what data is displayed
  const [searchTerm, setSearchTerm] = useState('');                   // Search text for appointments
  const [petSearchTerm, setPetSearchTerm] = useState('');             // Search text for pets
  const [statusFilter, setStatusFilter] = useState<string>('all');    // Filter appointments by status

  // UI states
  const [isLoading, setIsLoading] = useState(true);                   // Shows loading spinner

  const loadAppointments = async () => {
    try {
      const appointmentsData = await appointmentAPI.getAppointments();
      // Filter appointments for this veterinarian
      const vetAppointments = appointmentsData.filter(apt => apt.veterinarianId === user.id);
      setAppointments(vetAppointments);
    } catch (error: any) {
      console.error('Failed to load appointments:', error);
      toast.error(t('dashboard.failedLoadAppointments'));
    }
  };

  const loadPets = async () => {
    try {
      const petsData = await petAPI.getPets();
      setAllPets(petsData);
      setSelectedPet(prev => prev ? petsData.find(p => p.id === prev.id) || prev : null);
    } catch (error: any) {
      console.error('Failed to load pets:', error);
      toast.error(t('dashboard.failedLoadPets'));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadAppointments(), loadPets()]);
      setIsLoading(false);
    };
    loadData();
  }, [user.id]);

  const today = new Date().toDateString();
  const todayAppointments = appointments.filter(apt =>
    new Date(apt.date).toDateString() === today && apt.status !== 'cancelled'
  ).sort((a, b) => a.time.localeCompare(b.time));

  const upcomingAppointments = appointments.filter(apt =>
    new Date(apt.date) > new Date() && apt.status !== 'cancelled'
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedToday = appointments.filter(apt =>
    new Date(apt.date).toDateString() === today && apt.status === 'completed'
  ).length;

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentAPI.updateAppointment(appointmentId, { status: 'completed' });
      await loadAppointments();
      toast.success(t('dashboard.appointmentCompleted'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.failedUpdateAppointment');
      toast.error(message);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm(t('dashboard.confirmCancelAppointment'))) {
      return;
    }

    try {
      await appointmentAPI.updateAppointment(appointmentId, { status: 'cancelled' });
      await loadAppointments();
      toast.success(t('dashboard.appointmentCancelled'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.failedCancelAppointment');
      toast.error(message);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm(t('dashboard.confirmDeleteAppointment'))) {
      return;
    }

    try {
      // Note: Backend doesn't have delete endpoint, so we just mark as cancelled
      await appointmentAPI.updateAppointment(appointmentId, { status: 'cancelled' });
      await loadAppointments();
      toast.success(t('dashboard.appointmentCancelled'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.failedDeleteAppointment');
      toast.error(message);
    }
  };

  const handleEditMedicalHistory = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setMedicalForm({
      diagnosis: appointment.diagnosis || '',
      treatment: appointment.treatment || '',
      notes: appointment.notes || '',
      followUpDate: appointment.followUpDate || ''
    });
  };

  const handleSaveMedicalHistory = async () => {
    if (!editingAppointment) return;

    try {
      await appointmentAPI.updateAppointment(editingAppointment.id, {
        diagnosis: medicalForm.diagnosis,
        treatment: medicalForm.treatment,
        notes: medicalForm.notes,
        followUpDate: medicalForm.followUpDate
      });
      await loadAppointments();
      setEditingAppointment(null);
      toast.success(t('dashboard.medicalHistoryUpdated'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.failedUpdateMedicalHistory');
      toast.error(message);
    }
  };

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setReschedulingAppointment(appointment);
    setRescheduleForm({
      date: new Date(appointment.date),
      time: appointment.time
    });
  };

  const handleSaveReschedule = async () => {
    if (!reschedulingAppointment) return;

    try {
      await appointmentAPI.updateAppointment(reschedulingAppointment.id, {
        date: format(rescheduleForm.date, 'yyyy-MM-dd'),
        time: rescheduleForm.time
      });
      await loadAppointments();
      setReschedulingAppointment(null);
      toast.success(t('dashboard.rescheduleSuccess'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('dashboard.failedReschedule');
      toast.error(message);
    }
  };

  const handleCancelReschedule = () => {
    setReschedulingAppointment(null);
    setRescheduleForm({ date: new Date(), time: '' });
  };

  const handleCancelEdit = () => {
    setEditingAppointment(null);
    setMedicalForm({ diagnosis: '', treatment: '', notes: '', followUpDate: '' });
  };

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
                <h1 className="text-xl font-bold text-blue-600">PetCare</h1>
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">{t('dashboard.doctorPrefix', { name: user.fullName })}</h2>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="today">{t('dashboard.todaySchedule')}</TabsTrigger>
            <TabsTrigger value="upcoming">{t('dashboard.upcomingTab')}</TabsTrigger>
            <TabsTrigger value="manage">{t('dashboard.manageAppointments')}</TabsTrigger>
            <TabsTrigger value="medical">{t('dashboard.medicalHistory')}</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.todayAppointments')}</p>
                      <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.completedToday')}</p>
                      <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.pending')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {todayAppointments.filter(apt => apt.status === 'scheduled').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{t('dashboard.totalPatients')}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Set(appointments.map(apt => apt.petId)).size}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.todaySchedule')} - {new Date().toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <Clock className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{appointment.time}</p>
                            <p className="text-sm text-gray-600">{appointment.petName}</p>
                            <p className="text-sm text-gray-600">{translateAppointmentType(t, appointment.type)}</p>
                            <p className="text-sm text-gray-500">{appointment.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(appointment.status)}>
                            {translateAppointmentStatus(t, appointment.status)}
                          </Badge>
                          {appointment.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteAppointment(appointment.id)}
                            >
                              {t('dashboard.markComplete')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('dashboard.noAppointmentsToday')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.upcomingAppointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.slice(0, 10).map((appointment) => (
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
                              {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                            </p>
                            <p className="text-sm text-gray-600">{translateAppointmentType(t, appointment.type)}</p>
                            <p className="text-sm text-gray-500">{appointment.reason}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{translateAppointmentStatus(t, appointment.status)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t('dashboard.noUpcomingAppointments')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* Search and Filter Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('dashboard.searchByPetOwnerType')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder={t('dashboard.filterByStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dashboard.allAppointmentsOption')}</SelectItem>
                        <SelectItem value="scheduled">{t('dashboard.scheduled')}</SelectItem>
                        <SelectItem value="completed">{t('dashboard.completed')}</SelectItem>
                        <SelectItem value="cancelled">{t('dashboard.cancelled')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Appointments Management */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.allAppointments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredAppointments = appointments
                    .filter(apt => {
                      const matchesSearch = searchTerm === '' ||
                        apt.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        apt.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (apt.reason && apt.reason.toLowerCase().includes(searchTerm.toLowerCase()));

                      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;

                      return matchesSearch && matchesStatus;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return filteredAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{appointment.petName}</p>
                                <Badge className={getStatusColor(appointment.status)}>
                                  {translateAppointmentStatus(t, appointment.status)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                              </p>
                              <p className="text-sm text-gray-600">{translateAppointmentType(t, appointment.type)}</p>
                              {appointment.reason && (
                                <p className="text-sm text-gray-500">{appointment.reason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {appointment.status === 'scheduled' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRescheduleAppointment(appointment)}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  {t('dashboard.reschedule')}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteAppointment(appointment.id)}
                                >
                                  {t('dashboard.complete')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancelAppointment(appointment.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {appointment.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditMedicalHistory(appointment)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {t('dashboard.editHistory')}
                              </Button>
                            )}
                            {(appointment.status === 'cancelled' || appointment.status === 'completed') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAppointment(appointment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      {searchTerm || statusFilter !== 'all'
                        ? t('dashboard.noAppointmentsMatch')
                        : t('dashboard.noAppointmentsAvailable')}
                    </p>
                  );
                })()}
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
                  {t('dashboard.backToPatientList')}
                </Button>
                <MedicalHistoryManagement
                  pet={selectedPet}
                  onUpdate={loadPets}
                  canEdit={true}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{t('dashboard.patientMedicalHistory')}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('dashboard.searchPatients')}
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
                              <div className="mt-3 flex gap-2">
                                {pet.medicalHistory && pet.medicalHistory.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('dashboard.recordsCount', { count: pet.medicalHistory.length })}
                                  </Badge>
                                )}
                                {pet.allergies && pet.allergies.length > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {t('dashboard.allergiesCount', { count: pet.allergies.length })}
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        {petSearchTerm ? t('dashboard.noPatientsMatch') : t('dashboard.noPatientsAvailable')}
                      </p>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulingAppointment} onOpenChange={(open) => !open && handleCancelReschedule()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboard.rescheduleTitle')}</DialogTitle>
            <DialogDescription>
              {reschedulingAppointment && (
                <>
                  {t('dashboard.patient')}: <strong>{reschedulingAppointment.petName}</strong> -
                  {t('dashboard.type')}: <strong>{reschedulingAppointment.type}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {reschedulingAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('dashboard.newDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(rescheduleForm.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={rescheduleForm.date}
                      onSelect={(date) => date && setRescheduleForm(prev => ({ ...prev, date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule-time">{t('dashboard.newTime')}</Label>
                <Select
                  value={rescheduleForm.time}
                  onValueChange={(value) => setRescheduleForm(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('dashboard.selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'].map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelReschedule}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveReschedule}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('dashboard.saveChanges')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Medical History Edit Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dashboard.editMedicalHistoryTitle')}</DialogTitle>
            <DialogDescription>
              {editingAppointment && (
                <>
                  {t('dashboard.patient')}: <strong>{editingAppointment.petName}</strong> -
                  {t('dashboard.appointmentDate')}: <strong>{new Date(editingAppointment.date).toLocaleDateString()}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('dashboard.typeOfAppointment')}</Label>
                  <Input value={editingAppointment.type} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('dashboard.reasonForVisit')}</Label>
                  <Input value={editingAppointment.reason || ''} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">{t('dashboard.diagnosis')}</Label>
                <Textarea
                  id="diagnosis"
                  value={medicalForm.diagnosis}
                  onChange={(e) => setMedicalForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder={t('dashboard.diagnosisPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatment">{t('dashboard.treatment')}</Label>
                <Textarea
                  id="treatment"
                  value={medicalForm.treatment}
                  onChange={(e) => setMedicalForm(prev => ({ ...prev, treatment: e.target.value }))}
                  placeholder={t('dashboard.treatmentPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('dashboard.additionalNotes')}</Label>
                <Textarea
                  id="notes"
                  value={medicalForm.notes}
                  onChange={(e) => setMedicalForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('dashboard.notesPlaceholder')}
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveMedicalHistory}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('dashboard.saveMedicalHistory')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
