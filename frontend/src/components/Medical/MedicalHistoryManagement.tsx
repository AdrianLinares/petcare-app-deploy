/**
 * MedicalHistoryManagement Component
 * 
 * BEGINNER EXPLANATION:
 * This is an all-in-one medical management interface for a pet. It combines multiple
 * medical data types and pet details in one comprehensive view.
 * 
 * Key Features:
 * 1. Pet Basic Information:
 *    - Weight tracking (with edit capability)
 *    - Allergies list (comma-separated)
 *    - General notes about the pet
 * 
 * 2. Three Types of Medical Records:
 *    - Medical Records: General health events
 *    - Vaccinations: Vaccine history and schedules
 *    - Medications: Current and past prescriptions
 * 
 * 3. Full CRUD Operations:
 *    - Create: Add new records via forms
 *    - Read: View all records in tables
 *    - Update: Edit existing records inline
 *    - Delete: Remove records (with confirmation)
 * 
 * Architecture:
 * - Uses tabs to organize different record types
 * - Each record type has its own dialog form
 * - Consistent CRUD pattern across all record types
 * - Single confirmation dialog used for all deletions
 * 
 * Permission Control:
 * - canEdit prop determines if user can modify records
 * - When canEdit=false, all add/edit/delete buttons are hidden
 * - Typically true for vets/admins, false for pet owners
 * 
 * State Management Pattern:
 * - Each record type has: data array, dialog state, form state, editing ID
 * - Opening form for new record: clears form, sets editing ID to null
 * - Opening form for edit: populates form, stores editing ID
 * - Saving: checks editing ID to determine create vs update
 * 
 * @param {Pet} pet - The pet whose medical history to manage
 * @param {Function} onUpdate - Callback when pet data changes (weight, allergies, notes)
 * @param {boolean} canEdit - Whether user has permission to add/edit/delete records
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, FileText, Syringe, Pill, AlertTriangle, ClipboardList, RefreshCw } from 'lucide-react';
import { Pet, MedicalRecord, VaccinationRecord, MedicationRecord } from '../../types';
import { petAPI, medicalRecordAPI, vaccinationAPI, medicationAPI } from '@/lib/api';
import { toast } from 'sonner';

interface MedicalHistoryManagementProps {
  pet: Pet;
  onUpdate: () => void;
  canEdit: boolean;
}

export default function MedicalHistoryManagement({ pet, onUpdate, canEdit }: MedicalHistoryManagementProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('medical');
  const [loading, setLoading] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, v, md] = await Promise.all([
        medicalRecordAPI.getByPet(pet.id),
        vaccinationAPI.getByPet(pet.id),
        medicationAPI.getByPet(pet.id),
      ]);
      setMedicalRecords(m);
      setVaccinations(v);
      setMedications(md);
    } catch (e) {
      toast.error(t('medical.failedLoadMedicalHistory'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id]);

  // Medical Record states
  const [medicalRecordDialog, setMedicalRecordDialog] = useState(false);
  const [editingMedicalId, setEditingMedicalId] = useState<string | null>(null);
  const [medicalForm, setMedicalForm] = useState<Partial<MedicalRecord>>({
    date: '',
    recordType: '',
    description: ''
  });

  // Vaccination states
  const [vaccinationDialog, setVaccinationDialog] = useState(false);
  const [editingVaccinationId, setEditingVaccinationId] = useState<string | null>(null);
  const [vaccinationForm, setVaccinationForm] = useState<Partial<VaccinationRecord>>({
    vaccine: '',
    date: '',
    nextDue: ''
  });

  // Medication states
  const [medicationDialog, setMedicationDialog] = useState(false);
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [medicationForm, setMedicationForm] = useState<Partial<MedicationRecord>>({
    name: '',
    dosage: '',
    startDate: '',
    endDate: ''
  });

  // Allergies state
  const [allergiesDialog, setAllergiesDialog] = useState(false);
  const [allergiesText, setAllergiesText] = useState('');

  // Conditions state
  const [conditionsDialog, setConditionsDialog] = useState(false);
  const [conditionsText, setConditionsText] = useState('');

  // Notes state
  const [notesDialog, setNotesDialog] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Weight state
  const [weightDialog, setWeightDialog] = useState(false);
  const [weightValue, setWeightValue] = useState('');

  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);

  // Medical Record handlers
  const handleOpenMedicalDialog = (record?: MedicalRecord) => {
    if (record) {
      setMedicalForm({
        date: record.date,
        recordType: record.recordType,
        description: record.description
      });
      setEditingMedicalId(record.id);
    } else {
      setMedicalForm({ date: '', recordType: '', description: '' });
      setEditingMedicalId(null);
    }
    setMedicalRecordDialog(true);
  };

  const handleSaveMedicalRecord = async () => {
    try {
      if (editingMedicalId) {
        await medicalRecordAPI.update(editingMedicalId, {
          date: medicalForm.date,
          recordType: medicalForm.recordType,
          description: medicalForm.description
        });
        toast.success(t('medical.recordUpdated'));
      } else {
        await medicalRecordAPI.create({
          petId: pet.id,
          date: medicalForm.date!,
          recordType: medicalForm.recordType!,
          description: medicalForm.description!
        });
        toast.success(t('medical.recordAdded'));
      }
      await loadAll();
      onUpdate();
      setMedicalRecordDialog(false);
    } catch (error: any) {
      console.error('Failed to save medical record:', error?.response?.data || error);
      toast.error(error?.response?.data?.error || t('medical.failedSaveRecord'));
    }
  };

  const handleDeleteMedicalRecord = (id: string) => {
    setDeleteAction(() => async () => {
      try {
        await medicalRecordAPI.delete(id);
        toast.success(t('medical.recordDeleted'));
        await loadAll();
        onUpdate();
      } catch (error) {
        toast.error(t('medical.failedDeleteRecord'));
      }
    });
    setDeleteDialog(true);
  };

  // Vaccination handlers
  const handleOpenVaccinationDialog = (record?: VaccinationRecord) => {
    if (record) {
      setVaccinationForm({
        vaccine: record.vaccine,
        date: record.date,
        nextDue: record.nextDue
      });
      setEditingVaccinationId(record.id);
    } else {
      setVaccinationForm({ vaccine: '', date: '', nextDue: '' });
      setEditingVaccinationId(null);
    }
    setVaccinationDialog(true);
  };

  const handleSaveVaccination = async () => {
    try {
      if (editingVaccinationId) {
        await vaccinationAPI.update(editingVaccinationId, {
          vaccine: vaccinationForm.vaccine,
          date: vaccinationForm.date,
          nextDue: vaccinationForm.nextDue
        });
        toast.success(t('medical.vaccinationUpdated'));
      } else {
        await vaccinationAPI.create({
          petId: pet.id,
          vaccine: vaccinationForm.vaccine!,
          date: vaccinationForm.date!,
          nextDue: vaccinationForm.nextDue
        });
        toast.success(t('medical.vaccinationAdded'));
      }
      await loadAll();
      onUpdate();
      setVaccinationDialog(false);
    } catch (error) {
      toast.error(t('medical.failedSaveVaccination'));
    }
  };

  const handleDeleteVaccination = (id: string) => {
    setDeleteAction(() => async () => {
      try {
        await vaccinationAPI.delete(id);
        toast.success(t('medical.vaccinationDeleted'));
        await loadAll();
        onUpdate();
      } catch (error) {
        toast.error(t('medical.failedDeleteVaccination'));
      }
    });
    setDeleteDialog(true);
  };

  // Medication handlers
  const handleOpenMedicationDialog = (record?: MedicationRecord) => {
    if (record) {
      setMedicationForm({
        name: record.name,
        dosage: record.dosage,
        startDate: record.startDate,
        endDate: record.endDate
      });
      setEditingMedicationId(record.id);
    } else {
      setMedicationForm({ name: '', dosage: '', startDate: '', endDate: '' });
      setEditingMedicationId(null);
    }
    setMedicationDialog(true);
  };

  const handleSaveMedication = async () => {
    try {
      if (editingMedicationId) {
        await medicationAPI.update(editingMedicationId, {
          name: medicationForm.name,
          dosage: medicationForm.dosage,
          startDate: medicationForm.startDate,
          endDate: medicationForm.endDate
        });
        toast.success(t('medical.medicationUpdated'));
      } else {
        await medicationAPI.create({
          petId: pet.id,
          name: medicationForm.name!,
          dosage: medicationForm.dosage!,
          startDate: medicationForm.startDate!,
          endDate: medicationForm.endDate
        });
        toast.success(t('medical.medicationAdded'));
      }
      await loadAll();
      onUpdate();
      setMedicationDialog(false);
    } catch (error) {
      toast.error(t('medical.failedSaveMedication'));
    }
  };

  const handleDeleteMedication = (id: string) => {
    setDeleteAction(() => async () => {
      try {
        await medicationAPI.delete(id);
        toast.success(t('medical.medicationDeleted'));
        await loadAll();
        onUpdate();
      } catch (error) {
        toast.error(t('medical.failedDeleteMedication'));
      }
    });
    setDeleteDialog(true);
  };

  // Allergies handlers
  const handleOpenAllergiesDialog = () => {
    setAllergiesText((pet.allergies || []).join(', '));
    setAllergiesDialog(true);
  };

  const handleSaveAllergies = async () => {
    try {
      const allergiesArray = allergiesText
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
      await petAPI.updatePet(pet.id, { allergies: allergiesArray });
      toast.success(t('medical.allergiesUpdated'));
      onUpdate();
      setAllergiesDialog(false);
    } catch (error) {
      toast.error(t('medical.failedUpdateAllergies'));
    }
  };

  // Conditions handlers
  const handleOpenConditionsDialog = () => {
    setConditionsText(pet.conditions || '');
    setConditionsDialog(true);
  };

  const handleSaveConditions = async () => {
    try {
      await petAPI.updatePet(pet.id, { conditions: conditionsText || null });
      toast.success(t('medical.conditionsUpdated'));
      onUpdate();
      setConditionsDialog(false);
    } catch (error) {
      toast.error(t('medical.failedUpdateConditions'));
    }
  };

  // Notes handlers
  const handleOpenNotesDialog = () => {
    setNotesText(pet.notes || '');
    setNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    try {
      await petAPI.updatePet(pet.id, { notes: notesText });
      toast.success(t('medical.notesUpdated'));
      onUpdate();
      setNotesDialog(false);
    } catch (error) {
      toast.error(t('medical.failedUpdateNotes'));
    }
  };

  // Weight handlers
  const handleOpenWeightDialog = () => {
    setWeightValue(pet.weight.toString());
    setWeightDialog(true);
  };

  const handleSaveWeight = async () => {
    try {
      const newWeight = parseFloat(weightValue);
      if (isNaN(newWeight) || newWeight <= 0) {
        toast.error(t('medical.invalidWeight'));
        return;
      }

      await petAPI.updatePet(pet.id, { weight: newWeight });
      toast.success(t('medical.weightUpdated'));
      onUpdate();
      setWeightDialog(false);
    } catch (error) {
      toast.error(t('medical.failedUpdateWeight'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Pet Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-blue-500" />
              <div>
                <h3 className="text-xl font-bold">{pet.name}</h3>
                <p className="text-sm text-gray-600">{pet.species} - {pet.breed}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>{t('medical.age')} {t('pets.years', { age: pet.age })}</p>
              <p>{t('medical.owner')} {pet.ownerId}</p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => canEdit && handleOpenAllergiesDialog()}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('medical.allergies')}</p>
                <p className="text-lg font-bold">{pet.allergies?.length || 0}</p>
              </div>
              {canEdit && <Edit className="h-4 w-4 text-gray-400" />}
            </div>
            {pet.allergies && pet.allergies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {pet.allergies.map((allergy, idx) => (
                  <Badge key={`${allergy}-${idx}`} variant="destructive" className="text-xs">{allergy}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => canEdit && handleOpenWeightDialog()}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('medical.weight')}</p>
                <p className="text-lg font-bold">{pet.weight} {t('medical.kg')}</p>
              </div>
              {canEdit && <Edit className="h-4 w-4 text-gray-400" />}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => canEdit && handleOpenConditionsDialog()}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('medical.conditions')}</p>
                <p className="text-sm text-gray-500 truncate">{pet.conditions || t('medical.noConditions')}</p>
              </div>
              {canEdit && <Edit className="h-4 w-4 text-gray-400" />}
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => canEdit && handleOpenNotesDialog()}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('medical.notes')}</p>
                <p className="text-sm text-gray-500 truncate">{pet.notes || t('medical.noNotes')}</p>
              </div>
              {canEdit && <Edit className="h-4 w-4 text-gray-400" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical Records Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medical">
            <FileText className="h-4 w-4 mr-2" />
            {t('medical.medicalHistory')}
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            <Syringe className="h-4 w-4 mr-2" />
            {t('medical.vaccinations')}
          </TabsTrigger>
          <TabsTrigger value="medications">
            <Pill className="h-4 w-4 mr-2" />
            {t('medical.medications')}
          </TabsTrigger>
        </TabsList>

        {/* Medical History Tab */}
        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('medical.medicalHistory')}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('medical.refresh')}
                  </Button>
                  {canEdit && (
                    <Button onClick={() => handleOpenMedicalDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('medical.addRecord')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-500 py-8">{t('medical.loading')}</p>
              ) : medicalRecords && medicalRecords.length > 0 ? (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">{record.recordType}</Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(record.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{record.description}</p>
                          <p className="text-xs text-gray-600">{t('medical.veterinarian')} {record.veterinarianName}</p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenMedicalDialog(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMedicalRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('medical.noMedicalHistory')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccinations Tab */}
        <TabsContent value="vaccinations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('medical.vaccinations')}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('medical.refresh')}
                  </Button>
                  {canEdit && (
                    <Button onClick={() => handleOpenVaccinationDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('medical.addVaccination')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-500 py-8">{t('medical.loading')}</p>
              ) : vaccinations && vaccinations.length > 0 ? (
                <div className="space-y-4">
                  {vaccinations.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{record.vaccine}</p>
                          <p className="text-sm text-gray-600">
                            {t('medical.date')} {new Date(record.date).toLocaleDateString()}
                          </p>
                          {record.nextDue && (
                            <p className="text-sm text-gray-600">
                              {t('medical.nextDue')} {new Date(record.nextDue).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenVaccinationDialog(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteVaccination(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('medical.noVaccinations')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('medical.medications')}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAll}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('medical.refresh')}
                  </Button>
                  {canEdit && (
                    <Button onClick={() => handleOpenMedicationDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('medical.addMedication')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-500 py-8">{t('medical.loading')}</p>
              ) : medications && medications.length > 0 ? (
                <div className="space-y-4">
                  {medications.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium mb-1">{record.name}</p>
                          <p className="text-sm text-gray-600">{t('medical.dosage')} {record.dosage}</p>
                          <p className="text-sm text-gray-600">
                            {t('medical.start')} {new Date(record.startDate).toLocaleDateString()}
                          </p>
                          {record.endDate && (
                            <p className="text-sm text-gray-600">
                              {t('medical.end')} {new Date(record.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenMedicationDialog(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMedication(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('medical.noMedications')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Medical Record Dialog */}
      <Dialog open={medicalRecordDialog} onOpenChange={setMedicalRecordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMedicalId ? t('medical.editMedicalRecord') : t('medical.addMedicalRecord')}</DialogTitle>
            <DialogDescription>{t('medical.medicalRecordDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.date')}</Label>
              <Input
                type="date"
                value={medicalForm.date}
                onChange={(e) => setMedicalForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.recordType')}</Label>
              <Input
                placeholder={t('medical.recordTypePlaceholder')}
                value={medicalForm.recordType}
                onChange={(e) => setMedicalForm(prev => ({ ...prev, recordType: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.description')}</Label>
              <Textarea
                placeholder={t('medical.descriptionPlaceholder')}
                value={medicalForm.description}
                onChange={(e) => setMedicalForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMedicalRecordDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveMedicalRecord}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vaccination Dialog */}
      <Dialog open={vaccinationDialog} onOpenChange={setVaccinationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVaccinationId ? t('medical.editVaccination') : t('medical.addVaccinationRecord')}</DialogTitle>
            <DialogDescription>{t('medical.vaccinationDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.vaccineName')}</Label>
              <Input
                placeholder={t('medical.vaccineNamePlaceholder')}
                value={vaccinationForm.vaccine}
                onChange={(e) => setVaccinationForm(prev => ({ ...prev, vaccine: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.dateAdministered')}</Label>
              <Input
                type="date"
                value={vaccinationForm.date}
                onChange={(e) => setVaccinationForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.nextDueDateLabel')}</Label>
              <Input
                type="date"
                value={vaccinationForm.nextDue}
                onChange={(e) => setVaccinationForm(prev => ({ ...prev, nextDue: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVaccinationDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveVaccination}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Medication Dialog */}
      <Dialog open={medicationDialog} onOpenChange={setMedicationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMedicationId ? t('medical.editMedication') : t('medical.addMedicationTitle')}</DialogTitle>
            <DialogDescription>{t('medical.medicationDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.medicationName')}</Label>
              <Input
                placeholder={t('medical.medicationNamePlaceholder')}
                value={medicationForm.name}
                onChange={(e) => setMedicationForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.dosageLabel')}</Label>
              <Input
                placeholder={t('medical.dosagePlaceholder')}
                value={medicationForm.dosage}
                onChange={(e) => setMedicationForm(prev => ({ ...prev, dosage: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.startDate')}</Label>
              <Input
                type="date"
                value={medicationForm.startDate}
                onChange={(e) => setMedicationForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('medical.endDateOptional')}</Label>
              <Input
                type="date"
                value={medicationForm.endDate || ''}
                onChange={(e) => setMedicationForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMedicationDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveMedication}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Allergies Dialog */}
      <Dialog open={allergiesDialog} onOpenChange={setAllergiesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medical.editAllergies')}</DialogTitle>
            <DialogDescription>{t('medical.allergiesDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.allergiesCommaSep')}</Label>
              <Textarea
                placeholder="e.g., Penicillin, Wheat, Chicken"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAllergiesDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveAllergies}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conditions Dialog */}
      <Dialog open={conditionsDialog} onOpenChange={setConditionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medical.editConditions')}</DialogTitle>
            <DialogDescription>{t('medical.conditionsDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.conditionsLabel')}</Label>
              <Textarea
                placeholder={t('medical.conditionsPlaceholder')}
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConditionsDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveConditions}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medical.editNotes')}</DialogTitle>
            <DialogDescription>{t('medical.notesDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.notes')}</Label>
              <Textarea
                placeholder={t('medical.notesPlaceholder')}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveNotes}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Dialog */}
      <Dialog open={weightDialog} onOpenChange={setWeightDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('medical.updateWeight')}</DialogTitle>
            <DialogDescription>{t('medical.weightDesc', { petName: pet.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('medical.weightKg')}</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g., 25.5"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWeightDialog(false)}>{t('medical.cancel')}</Button>
              <Button onClick={handleSaveWeight}>{t('medical.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('medical.confirmDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('medical.confirmDeleteMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('medical.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAction) deleteAction();
                setDeleteDialog(false);
                setDeleteAction(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('medical.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
