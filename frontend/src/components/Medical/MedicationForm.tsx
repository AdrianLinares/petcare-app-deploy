/**
 * MedicationForm Component
 * 
 * BEGINNER EXPLANATION:
 * This form tracks medications that pets are taking. It's like a digital prescription
 * tracker that helps owners and vets keep track of what medications are active.
 * 
 * Key Features:
 * - Records medication name and dosage instructions
 * - Tracks start and end dates for medication course
 * - Shows whether medication is currently active
 * - Optional end date for ongoing medications
 * 
 * Form Fields:
 * - Name: Medication name (e.g., "Amoxicillin")
 * - Dosage: How much and how often (e.g., "500mg twice daily")
 * - Start Date: When medication course began (defaults to today)
 * - End Date: When medication course ends (optional - leave blank for ongoing)
 * - Active: Checkbox to mark if medication is currently being taken
 * 
 * Use Cases:
 * - Prescribing antibiotics after surgery
 * - Recording ongoing medications for chronic conditions
 * - Tracking pain medication courses
 * - Managing flea/tick prevention schedules
 * 
 * Active Checkbox Behavior:
 * - Checked = Pet is currently taking this medication
 * - Unchecked = Medication has been discontinued
 * - Vets can deactivate medications without deleting the record
 * 
 * @param {string} petId - ID of the pet this medication is for
 * @param {Function} onClose - Callback to close the form dialog
 * @param {Function} onSuccess - Callback when medication is successfully added
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface MedicationFormProps {
  petId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MedicationForm({ petId, onClose, onSuccess }: MedicationFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await medicationAPI.create({
        petId,
        ...formData,
        endDate: formData.endDate || undefined,
      });
      toast.success(t('medical.medicationAdded'));
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedSaveMedication'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('medical.addMedicationTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('medical.medicationName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('medical.medicationNamePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="dosage">{t('medical.dosageLabel')}</Label>
            <Input
              id="dosage"
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
              placeholder={t('medical.dosagePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="startDate">{t('medical.startDate')}</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="endDate">{t('medical.endDateOptional')}</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked as boolean }))}
            />
            <Label htmlFor="active" className="cursor-pointer">
              {t('medical.activeMedication')}
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('medical.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('medical.adding') : t('medical.addMedication')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
