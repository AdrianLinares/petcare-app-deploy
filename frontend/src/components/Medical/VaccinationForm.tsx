/**
 * VaccinationForm Component
 * 
 * BEGINNER EXPLANATION:
 * This form records vaccinations that pets receive. It helps track vaccination history
 * and reminds owners when booster shots are due.
 * 
 * Key Features:
 * - Records vaccine name and administration date
 * - Tracks when next booster shot is due
 * - Simple, focused form for quick data entry
 * 
 * Form Fields:
 * - Vaccine Name: The specific vaccine given (e.g., "Rabies", "DHPP")
 * - Date Administered: When the vaccine was given (defaults to today)
 * - Next Due Date: When the booster shot should be given (optional)
 * 
 * Common Vaccines:
 * - Rabies: Usually required by law, booster every 1-3 years
 * - DHPP: Distemper combo vaccine, booster every 1-3 years
 * - Bordetella: Kennel cough, often required for boarding
 * - Lyme: Tick-borne disease prevention
 * 
 * Next Due Date Logic:
 * - If provided, system can show alerts for upcoming vaccinations
 * - Dashboard shows count of overdue vaccinations
 * - Helps owners stay on top of pet health requirements
 * 
 * Workflow:
 * 1. Vet administers vaccine
 * 2. Records vaccine name and date
 * 3. Calculates next due date (e.g., 1 year from today)
 * 4. Form saves to database
 * 5. System can now remind owner when booster is needed
 * 
 * @param {string} petId - ID of the pet that received the vaccination
 * @param {Function} onClose - Callback to close the form dialog
 * @param {Function} onSuccess - Callback when vaccination record is successfully created
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { vaccinationAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface VaccinationFormProps {
  petId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VaccinationForm({ petId, onClose, onSuccess }: VaccinationFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    nextDue: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await vaccinationAPI.create({
        petId,
        ...formData,
        nextDue: formData.nextDue || undefined,
      });
      toast.success(t('medical.vaccinationAdded'));
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('medical.failedSaveVaccination'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('medical.addVaccinationRecord')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vaccine">{t('medical.vaccineName')}</Label>
            <Input
              id="vaccine"
              value={formData.vaccine}
              onChange={(e) => setFormData(prev => ({ ...prev, vaccine: e.target.value }))}
              placeholder={t('medical.vaccineNamePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">{t('medical.dateAdministered')}</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="nextDue">{t('medical.nextDueOptional')}</Label>
            <Input
              id="nextDue"
              type="date"
              value={formData.nextDue}
              onChange={(e) => setFormData(prev => ({ ...prev, nextDue: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('medical.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('medical.adding') : t('medical.addVaccination')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
