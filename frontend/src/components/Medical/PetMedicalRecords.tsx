/**
 * PetMedicalRecords Component
 * 
 * BEGINNER EXPLANATION:
 * This is a comprehensive medical records viewer and manager for a specific pet.
 * Think of it as a digital medical file cabinet that shows all health records for one pet.
 * 
 * Key Features:
 * 1. Tabbed interface with 4 types of records:
 *    - Medical Records: General medical events (checkups, surgeries)
 *    - Vaccinations: Vaccination history and due dates
 *    - Medications: Current and past medications
 *    - Clinical Records: Detailed visit notes with diagnosis/treatment
 * 
 * 2. Permission-based editing:
 *    - Pet owners: Can VIEW all records (read-only)
 *    - Veterinarians: Can ADD new records
 *    - Administrators: Can ADD and DELETE records
 * 
 * 3. CRUD Operations:
 *    - Create: Add button opens form dialogs
 *    - Read: Tables display all records with details
 *    - Update: Some records can be deactivated (medications)
 *    - Delete: Delete buttons (admin only) remove records
 * 
 * Architecture:
 * - Loads all 4 record types in parallel when component mounts
 * - Each tab shows a different record type
 * - Forms appear as modal dialogs for adding records
 * - After any change, refreshes data from backend
 * 
 * Data Flow:
 * 1. Component mounts → Load all records from API
 * 2. User clicks Add → Show form dialog
 * 3. User submits form → Save to API
 * 4. On success → Reload all data → Close dialog
 * 
 * @param {string} petId - ID of the pet whose records to display
 * @param {string} petName - Name of the pet (for display in header)
 * @param {User} currentUser - Currently logged-in user (determines permissions)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  medicalRecordAPI,
  vaccinationAPI,
  medicationAPI,
  clinicalRecordAPI
} from '@/lib/api';
import type {
  MedicalRecord,
  VaccinationRecord,
  MedicationRecord,
  ClinicalRecord,
  User
} from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  FileText,
  Syringe,
  Pill,
  Stethoscope,
  Calendar,
  User as UserIcon,
  Trash2,
  Edit,
  AlertCircle
} from 'lucide-react';
import MedicalRecordForm from './MedicalRecordForm';
import VaccinationForm from './VaccinationForm';
import MedicationForm from './MedicationForm';
import ClinicalRecordForm from './ClinicalRecordForm';

interface PetMedicalRecordsProps {
  petId: string;
  petName: string;
  currentUser: User;
}

export default function PetMedicalRecords({
  petId,
  petName,
  currentUser
}: PetMedicalRecordsProps) {
  const { t } = useTranslation();
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('medical');

  // Form states
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [showVaccinationForm, setShowVaccinationForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showClinicalForm, setShowClinicalForm] = useState(false);

  // Edit states
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const isVetOrAdmin = currentUser.userType === 'veterinarian' || currentUser.userType === 'administrator';
  const isAdmin = currentUser.userType === 'administrator';

  useEffect(() => {
    loadAllRecords();
  }, [petId]);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      const [medical, vacc, meds, clinical] = await Promise.all([
        medicalRecordAPI.getByPet(petId),
        vaccinationAPI.getByPet(petId),
        medicationAPI.getByPet(petId),
        clinicalRecordAPI.getByPet(petId),
      ]);
      setMedicalRecords(medical);
      setVaccinations(vacc);
      setMedications(meds);
      setClinicalRecords(clinical);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedLoadRecords'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedicalRecord = async (id: string) => {
    if (!confirm(t('medical.confirmDeleteMedicalRecord'))) return;

    try {
      await medicalRecordAPI.delete(id);
      setMedicalRecords(prev => prev.filter(r => r.id !== id));
      toast.success(t('medical.recordDeleted'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedDeleteRecord'));
    }
  };

  const handleDeleteVaccination = async (id: string) => {
    if (!confirm(t('medical.confirmDeleteVaccination'))) return;

    try {
      await vaccinationAPI.delete(id);
      setVaccinations(prev => prev.filter(r => r.id !== id));
      toast.success(t('medical.vaccinationDeleted'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedDeleteVaccination'));
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm(t('medical.confirmDeleteMedication'))) return;

    try {
      await medicationAPI.delete(id);
      setMedications(prev => prev.filter(r => r.id !== id));
      toast.success(t('medical.medicationDeleted'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedDeleteMedication'));
    }
  };

  const handleDeactivateMedication = async (id: string) => {
    try {
      await medicationAPI.deactivate(id);
      setMedications(prev =>
        prev.map(m => m.id === id ? { ...m, active: false } : m)
      );
      toast.success(t('medical.medicationDeactivated'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedDeactivateMedication'));
    }
  };

  const handleDeleteClinicalRecord = async (id: string) => {
    if (!confirm(t('medical.confirmDeleteClinicalRecord'))) return;

    try {
      await clinicalRecordAPI.delete(id);
      setClinicalRecords(prev => prev.filter(r => r.id !== id));
      toast.success(t('medical.clinicalRecordDeleted'));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedDeleteClinicalRecord'));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">{t('medical.loadingRecords')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('medical.title')} - {petName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="medical" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('medical.medicalTab', { count: medicalRecords.length })}
              </TabsTrigger>
              <TabsTrigger value="vaccinations" className="flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                {t('medical.vaccinationsTab', { count: vaccinations.length })}
              </TabsTrigger>
              <TabsTrigger value="medications" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                {t('medical.medicationsTab', { count: medications.filter(m => m.active).length })}
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                {t('medical.clinicalTab', { count: clinicalRecords.length })}
              </TabsTrigger>
            </TabsList>

            {/* Medical Records Tab */}
            <TabsContent value="medical" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('medical.medicalHistory')}</h3>
                {isVetOrAdmin && (
                  <Button onClick={() => setShowMedicalForm(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('medical.addRecord')}
                  </Button>
                )}
              </div>

              {medicalRecords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>{t('medical.noMedicalRecords')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medicalRecords.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="capitalize">{record.recordType}</Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(record.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm mb-2">{record.description}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3" />
                              {record.veterinarianName}
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMedicalRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vaccinations Tab */}
            <TabsContent value="vaccinations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('medical.vaccinationRecords')}</h3>
                {isVetOrAdmin && (
                  <Button onClick={() => setShowVaccinationForm(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('medical.addVaccination')}
                  </Button>
                )}
              </div>

              {vaccinations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Syringe className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>{t('medical.noVaccinationRecords')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccinations.map((vacc) => {
                    const nextDue = vacc.nextDue ? new Date(vacc.nextDue) : null;
                    const isDue = nextDue && nextDue <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <Card key={vacc.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold">{vacc.vaccine}</span>
                                {isDue && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {t('medical.dueSoon')}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t('medical.administered')} {new Date(vacc.date).toLocaleDateString()}
                                </div>
                                {vacc.nextDue && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('medical.nextDue')} {new Date(vacc.nextDue).toLocaleDateString()}
                                  </div>
                                )}
                                {vacc.administeredByName && (
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3" />
                                    {vacc.administeredByName}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVaccination(vacc.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Medications Tab */}
            <TabsContent value="medications" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('medical.medications')}</h3>
                {isVetOrAdmin && (
                  <Button onClick={() => setShowMedicationForm(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('medical.addMedication')}
                  </Button>
                )}
              </div>

              {medications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pill className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>{t('medical.noMedicationRecords')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((med) => (
                    <Card key={med.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{med.name}</span>
                              <Badge variant={med.active ? 'default' : 'secondary'}>
                                {med.active ? t('medical.active') : t('medical.inactive')}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{t('medical.dosage')} {med.dosage}</p>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {t('medical.start')} {new Date(med.startDate).toLocaleDateString()}
                              </div>
                              {med.endDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {t('medical.end')} {new Date(med.endDate).toLocaleDateString()}
                                </div>
                              )}
                              {med.prescribedByName && (
                                <div className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  {t('medical.prescribedBy')} {med.prescribedByName}
                                </div>
                              )}
                            </div>
                          </div>
                          {isVetOrAdmin && (
                            <div className="flex gap-1">
                              {med.active && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeactivateMedication(med.id)}
                                >
                                  {t('medical.deactivate')}
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMedication(med.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Clinical Records Tab */}
            <TabsContent value="clinical" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('medical.clinicalRecords')}</h3>
                {isVetOrAdmin && (
                  <Button onClick={() => setShowClinicalForm(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('medical.addClinicalRecord')}
                  </Button>
                )}
              </div>

              {clinicalRecords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>{t('medical.noClinicalRecords')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalRecords.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">
                                {record.appointmentType || t('medical.clinicalVisit')}
                              </span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(record.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <strong>{t('medical.symptomsField')}</strong> {record.symptoms}
                              </div>
                              <div>
                                <strong>{t('medical.diagnosisField')}</strong> {record.diagnosis}
                              </div>
                              <div>
                                <strong>{t('medical.treatmentField')}</strong> {record.treatment}
                              </div>
                              {record.medications && record.medications.length > 0 && (
                                <div>
                                  <strong>{t('medical.medicationsField')}</strong> {record.medications.join(', ')}
                                </div>
                              )}
                              {record.notes && (
                                <div>
                                  <strong>{t('medical.notesField')}</strong> {record.notes}
                                </div>
                              )}
                              {record.followUpDate && (
                                <div className="text-muted-foreground">
                                  <strong>{t('medical.followUp')}</strong>{' '}
                                  {new Date(record.followUpDate).toLocaleDateString()}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <UserIcon className="h-3 w-3" />
                                {record.veterinarianName}
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClinicalRecord(record.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Forms */}
      {showMedicalForm && (
        <MedicalRecordForm
          petId={petId}
          onClose={() => setShowMedicalForm(false)}
          onSuccess={() => {
            loadAllRecords();
            setShowMedicalForm(false);
          }}
        />
      )}

      {showVaccinationForm && (
        <VaccinationForm
          petId={petId}
          onClose={() => setShowVaccinationForm(false)}
          onSuccess={() => {
            loadAllRecords();
            setShowVaccinationForm(false);
          }}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          petId={petId}
          onClose={() => setShowMedicationForm(false)}
          onSuccess={() => {
            loadAllRecords();
            setShowMedicationForm(false);
          }}
        />
      )}

      {showClinicalForm && (
        <ClinicalRecordForm
          petId={petId}
          onClose={() => setShowClinicalForm(false)}
          onSuccess={() => {
            loadAllRecords();
            setShowClinicalForm(false);
          }}
        />
      )}
    </div>
  );
}
