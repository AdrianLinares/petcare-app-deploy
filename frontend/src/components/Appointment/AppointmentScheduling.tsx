/**
 * Appointment Scheduling Component
 * 
 * Provides a complete appointment management interface for pet owners:
 * - Schedule new appointments with veterinarians
 * - View upcoming appointments
 * - Review past appointment history
 * - Cancel scheduled appointments
 * 
 * BEGINNER EXPLANATION:
 * Think of this like booking a doctor's appointment online.
 * 1. Pick which pet needs to see the vet
 * 2. Choose a veterinarian
 * 3. Select a date and time slot
 * 4. Describe the reason for visit
 * 5. Submit and get confirmation
 * 
 * COMPONENT STRUCTURE:
 * - Form Dialog: For creating new appointments
 * - Upcoming Appointments Card: Shows future appointments
 * - Past Appointments Card: Shows history
 * 
 * VALIDATION:
 * - Must have at least one registered pet
 * - Must select all required fields (pet, vet, date, time, type, reason)
 * - Date must be in the future
 * - Time must be during clinic hours
 * 
 * @param user - The logged-in pet owner
 * @param pets - Array of user's pets
 * @param appointments - Array of all appointments
 * @param setAppointments - Function to update appointments list
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Clock, User as UserIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Pet, Appointment, User } from '../../types';
import { appointmentAPI, userAPI, translateApiError } from '@/lib/api';
import { toast } from 'sonner';
import { translateAppointmentType, translateAppointmentStatus } from '@/i18n/appointment';

interface AppointmentSchedulingProps {
  user: User;
  pets: Pet[];
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
}

export default function AppointmentScheduling({ user, pets, appointments, setAppointments }: AppointmentSchedulingProps) {
  const { t } = useTranslation();

  // STATE: Controls whether appointment dialog is open
  const [isScheduling, setIsScheduling] = useState(false);

  // STATE: Loading indicator during form submission
  const [isLoading, setIsLoading] = useState(false);

  // STATE: The date selected in calendar (undefined = not selected yet)
  const [selectedDate, setSelectedDate] = useState<Date>();

  // STATE: List of available veterinarians loaded from backend
  const [veterinarians, setVeterinarians] = useState<User[]>([]);

  // STATE: Form data for new appointment
  // Stores all user inputs before submission
  const [formData, setFormData] = useState({
    petId: '',           // Which pet needs appointment
    veterinarianId: '',  // Which vet to see
    type: '',            // Type of appointment (checkup, vaccination, etc.)
    time: '',            // Time slot (09:00, 09:30, etc.)
    reason: '',          // Why pet needs to see vet
    notes: ''            // Additional information (optional)
  });

  /**
   * EFFECT: Load Available Veterinarians
   * 
   * Runs once when component mounts to fetch list of all vets.
   * This populates the veterinarian dropdown in the form.
   * 
   * BEGINNER EXPLANATION:
   * When this component first appears, we need to know who the veterinarians are
   * so users can choose one. This effect fetches that list from the backend.
   */
  useEffect(() => {
    const loadVeterinarians = async () => {
      try {
        // Fetch only users with userType='veterinarian'
        const result = await userAPI.listUsers({ userType: 'veterinarian' });
        setVeterinarians(result.users || []);
      } catch (error) {
        console.error('Failed to load veterinarians:', error);
        // Silently fail - user can still submit form if they know vet ID
      }
    };
    loadVeterinarians();
  }, []); // Empty dependency array = run once on mount

  const appointmentTypes = [
    'checkup',
    'vaccination',
    'emergency',
    'surgery',
    'dental',
    'grooming',
    'followup',
    'consultation'
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  const resetForm = () => {
    setFormData({
      petId: '',
      veterinarianId: '',
      type: '',
      time: '',
      reason: '',
      notes: ''
    });
    setSelectedDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error(t('appointment.selectDateError'));
      return;
    }

    const pet = pets.find(p => p.id === formData.petId);
    if (!pet) {
      toast.error(t('appointment.selectPetError'));
      return;
    }

    setIsLoading(true);

    try {
      const appointmentData = {
        petId: formData.petId,
        veterinarianId: formData.veterinarianId,
        type: formData.type,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: formData.time,
        reason: formData.reason
      };

      const newAppointment = await appointmentAPI.createAppointment(appointmentData);
      setAppointments(prev => [...prev, newAppointment]);
      toast.success(t('appointment.scheduledSuccess'));

      setIsScheduling(false);
      resetForm();
    } catch (error: any) {
      const message = translateApiError(error, t, 'appointment.failedSchedule');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Cancel Appointment
   * 
   * Cancels a scheduled appointment by updating its status.
   * Requires user confirmation before proceeding.
   * 
   * FLOW:
   * 1. Show browser confirmation dialog
   * 2. If confirmed, call API to update status
   * 3. Update local state to reflect cancellation
   * 4. Show success/error message
   * 
   * @param appointmentId - ID of appointment to cancel
   */
  const handleCancelAppointment = async (appointmentId: string) => {
    // Browser confirmation dialog (returns true if user clicks OK)
    if (!confirm(t('appointment.confirmCancel'))) {
      return;
    }

    try {
      // Update appointment status in backend
      await appointmentAPI.updateAppointment(appointmentId, { status: 'cancelled' });

      // Update local state to reflect cancellation
      // Cast status to correct type to satisfy TypeScript
      const updatedAppointments = appointments.map(apt =>
        apt.id === appointmentId ? { ...apt, status: 'cancelled' as const } : apt
      );
      setAppointments(updatedAppointments);

      toast.success(t('appointment.cancelledSuccess'));
    } catch (error: any) {
      const message = translateApiError(error, t, 'appointment.failedCancel');
      toast.error(message);
    }
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

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.date) > new Date() && apt.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastAppointments = appointments
    .filter(apt => new Date(apt.date) <= new Date() || apt.status === 'cancelled')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('appointment.title')}</h2>
        <Dialog open={isScheduling} onOpenChange={(open) => {
          setIsScheduling(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={pets.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {t('appointment.scheduleAppointment')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('appointment.newAppointment')}</DialogTitle>
              <DialogDescription>
                {t('appointment.newAppointmentDesc')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="petId">{t('appointment.selectPet')}</Label>
                  <Select
                    value={formData.petId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, petId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('appointment.selectPetPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="veterinarian">{t('appointment.veterinarian')}</Label>
                  <Select
                    value={formData.veterinarianId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, veterinarianId: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('appointment.selectVeterinarianPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {veterinarians.map((vet) => (
                        <SelectItem key={vet.id} value={vet.id}>
                          {t('appointment.doctorPrefix', { name: vet.fullName })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('appointment.date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : t('appointment.pickDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">{t('appointment.time')}</Label>
                  <Select
                    value={formData.time}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('appointment.selectTime')} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('appointment.appointmentType')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('appointment.selectTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {translateAppointmentType(t, type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">{t('appointment.reasonForVisit')}</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  placeholder={t('appointment.reasonPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('appointment.additionalNotes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('appointment.notesPlaceholder')}
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsScheduling(false)} disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('appointment.scheduling') : t('appointment.scheduleAppointment')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('appointment.noPetsRegistered')}</h3>
            <p className="text-gray-600">{t('appointment.noPetsDesc')}</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            {t('appointment.upcomingAppointments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.petName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                      <p className="text-sm text-gray-600">{t('appointment.doctorPrefix', { name: appointment.veterinarian })}</p>
                      <p className="text-sm text-gray-500">{appointment.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{translateAppointmentType(t, appointment.type)}</Badge>
                    <Badge className={getStatusColor(appointment.status)}>
                      {translateAppointmentStatus(t, appointment.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelAppointment(appointment.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('appointment.noUpcomingAppointments')}</p>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {t('appointment.pastAppointments')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastAppointments.length > 0 ? (
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.petName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                      <p className="text-sm text-gray-600">{t('appointment.doctorPrefix', { name: appointment.veterinarian })}</p>
                      <p className="text-sm text-gray-500">{appointment.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{translateAppointmentType(t, appointment.type)}</Badge>
                    <Badge className={getStatusColor(appointment.status)}>
                      {translateAppointmentStatus(t, appointment.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('appointment.noPastAppointments')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}