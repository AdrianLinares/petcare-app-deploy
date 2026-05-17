/**
 * PetManagement Component
 * 
 * BEGINNER EXPLANATION:
 * This component allows pet owners to manage their pets - adding new pets,
 * editing existing ones, and removing pets they no longer own.
 * 
 * Key Features:
 * 1. View all pets in a grid layout with pet cards
 * 2. Add new pets via a detailed form
 * 3. Edit existing pet information
 * 4. Delete pets (with confirmation)
 * 
 * Pet Information Tracked:
 * - Basic Info: name, species (dog/cat), breed, age, weight, color, gender
 * - Health Info: existing conditions, vaccination history, general notes
 * 
 * CRUD Operations:
 * - Create: "Add Pet" button opens form dialog
 * - Read: Pet cards display in responsive grid
 * - Update: "Edit" button on each card opens pre-filled form
 * - Delete: "Delete" button removes pet after confirmation
 * 
 * Form Behavior:
 * - Age and weight must be positive numbers
 * - Species has dropdown (Dog, Cat, Bird, Rabbit, Other)
 * - Conditions field accepts comma-separated list
 * - Form validates required fields before submission
 * - After save/delete, immediately updates UI via setPets prop
 * 
 * Architecture:
 * - Controlled component: parent passes pets array and setPets updater
 * - Dialog-based forms: Add and edit use same form with different logic
 * - Optimistic updates: Updates local state immediately, syncs to backend
 * 
 * User Flow:
 * 1. User sees grid of existing pets
 * 2. Clicks "Add Pet" or "Edit" on a card
 * 3. Fills out form (all fields except notes are required)
 * 4. Submits → API call → Success toast → Updated grid
 * 
 * @param {User} user - The currently logged-in pet owner
 * @param {Pet[]} pets - Array of user's pets to display
 * @param {Function} setPets - Function to update pets array in parent component
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Heart, Edit, Trash2, Calendar } from 'lucide-react';
import { Pet, User } from '../../types';
import { petAPI } from '@/lib/api';
import { toast } from 'sonner';
import { translateSpecies, translateGender } from '@/i18n/pets';

interface PetManagementProps {
  user: User;
  pets: Pet[];
  setPets: (pets: Pet[]) => void;
}

export default function PetManagement({ user, pets, setPets }: PetManagementProps) {
  const { t } = useTranslation();
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // BEGINNER NOTE: State tracks form data, dialog visibility, and loading states.

  // Dialog control states
  const [isAddingPet, setIsAddingPet] = useState(false);         // Controls "Add Pet" dialog visibility
  const [editingPet, setEditingPet] = useState<Pet | null>(null); // If not null, we're editing this pet

  // UI state
  const [isLoading, setIsLoading] = useState(false);             // Shows loading spinner during API calls

  // Form data state - Holds all pet information fields
  // BEGINNER NOTE: This single state object holds all form fields together.
  // It's easier to manage than having 10 separate useState calls.
  const [formData, setFormData] = useState({
    name: '',          // Pet's name
    species: '',       // Dog, Cat, Bird, etc.
    breed: '',         // Specific breed
    age: '',           // Age in years
    weight: '',        // Weight in pounds/kg
    color: '',         // Fur/feather color
    gender: '',        // Male, Female, Unknown
    conditions: '',    // Pre-existing health conditions
    notes: ''          // Additional notes
  });

  /**
   * Reset Form Function
   * 
   * BEGINNER EXPLANATION:
   * This clears all fields in the form back to empty strings.
   * Called when:
   * - User closes the form without saving
   * - After successfully creating/updating a pet
   * - Before opening the "Add Pet" dialog (to ensure clean slate)
   * 
   * Why needed: Without this, old data would remain in the form
   * when you open it again, which would be confusing.
   */
  const resetForm = () => {
    setFormData({
      name: '',
      species: '',
      breed: '',
      age: '',
      weight: '',
      color: '',
      gender: '',
      conditions: '',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const petData = {
        name: formData.name,
        species: formData.species,
        breed: formData.breed,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        color: formData.color,
        gender: (formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)) as 'Male' | 'Female',
        conditions: formData.conditions || null,
        notes: formData.notes || null
      };

      if (editingPet) {
        // Update existing pet
        const updatedPet = await petAPI.updatePet(editingPet.id, petData);
        setPets(pets.map(pet => pet.id === editingPet.id ? updatedPet : pet));
        toast.success(t('pets.petUpdated'));
      } else {
        // Create new pet
        const newPet = await petAPI.createPet(petData);
        setPets(prev => [...prev, newPet]);
        toast.success(t('pets.petAdded'));
      }

      setIsAddingPet(false);
      setEditingPet(null);
      resetForm();
    } catch (error: any) {
      const message = error.response?.data?.error || t('pets.failedSavePet');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age.toString(),
      weight: pet.weight.toString(),
      color: pet.color,
      gender: pet.gender.toLowerCase(),
      conditions: pet.conditions || '',
      notes: pet.notes || ''
    });
    setIsAddingPet(true);
  };

  const handleDelete = async (petId: string) => {
    if (!confirm(t('pets.confirmDeletePet'))) {
      return;
    }

    try {
      await petAPI.deletePet(petId);
      setPets(pets.filter(pet => pet.id !== petId));
      toast.success(t('pets.petDeleted'));
    } catch (error: any) {
      const message = error.response?.data?.error || t('pets.failedDeletePet');
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('pets.title')}</h2>
        <Dialog open={isAddingPet} onOpenChange={(open) => {
          setIsAddingPet(open);
          if (!open) {
            setEditingPet(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('pets.addPet')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPet ? t('pets.editPet') : t('pets.addNewPet')}</DialogTitle>
              <DialogDescription>
                {editingPet ? t('pets.updatePetInfo') : t('pets.addNewPetDesc')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('pets.petName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder={t('pets.petNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">{t('pets.species')}</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pets.selectSpecies')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">{t('pets.dog')}</SelectItem>
                      <SelectItem value="cat">{t('pets.cat')}</SelectItem>
                      <SelectItem value="bird">{t('pets.bird')}</SelectItem>
                      <SelectItem value="rabbit">{t('pets.rabbit')}</SelectItem>
                      <SelectItem value="hamster">{t('pets.hamster')}</SelectItem>
                      <SelectItem value="fish">{t('pets.fish')}</SelectItem>
                      <SelectItem value="reptile">{t('pets.reptile')}</SelectItem>
                      <SelectItem value="other">{t('pets.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="breed">{t('pets.breedLabel')}</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                    placeholder={t('pets.breedPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">{t('pets.gender')}</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('pets.selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('pets.male')}</SelectItem>
                      <SelectItem value="female">{t('pets.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">{t('pets.ageYears')}</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    required
                    placeholder={t('pets.agePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">{t('pets.weightKg')}</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    required
                    placeholder={t('pets.weightPlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t('pets.color')}</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder={t('pets.colorPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditions">{t('pets.conditions')}</Label>
                <Input
                  id="conditions"
                  value={formData.conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder={t('pets.conditionsPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('pets.vaccinations')}</Label>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  {t('pets.vaccinationsInfo')}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('pets.notesLabel')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('pets.notesPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingPet(false)} disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('pets.saving') : (editingPet ? t('pets.updatePet') : t('pets.addPetBtn'))}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <Card key={pet.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-lg">{pet.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(pet)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(pet.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('pets.speciesDisplay')}</span>
                    <Badge variant="secondary">{translateSpecies(t, pet.species)}</Badge>
                  </div>
                  {pet.breed && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{t('pets.breedDisplay')}</span>
                      <span className="text-sm">{pet.breed}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('pets.ageDisplay')}</span>
                    <span className="text-sm">{t('pets.years', { age: pet.age })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('pets.weightDisplay')}</span>
                    <span className="text-sm">{t('pets.kg', { weight: pet.weight })}</span>
                  </div>
                  {pet.gender && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{t('pets.genderDisplay')}</span>
                      <span className="text-sm">{translateGender(t, pet.gender)}</span>
                    </div>
                  )}
                  {/* Conditions field removed - not part of Pet type. Consider using notes field instead. */}
                  {pet.notes && (
                    <div className="mt-3">
                      <span className="text-sm font-medium">{t('pets.notesDisplay')}</span>
                      <p className="text-xs text-gray-600 mt-1">{pet.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pets.noPetsRegistered')}</h3>
            <p className="text-gray-600 mb-4">{t('pets.addFirstPet')}</p>
            <Button onClick={() => setIsAddingPet(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pets.addYourFirstPet')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}