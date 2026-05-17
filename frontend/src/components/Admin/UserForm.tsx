/**
 * User Form Component (Admin)
 * 
 * A comprehensive form for creating or editing user accounts.
 * Used by administrators to manage users in the system.
 * 
 * BEGINNER EXPLANATION:
 * Think of this as an admin control panel for managing users.
 * It can create new users (pet owners, vets, or admins) or edit existing ones.
 * The form shows different fields based on the user type being created.
 * 
 * FORM VALIDATION:
 * Uses react-hook-form with Zod schema validation:
 * - react-hook-form: Manages form state and validation
 * - Zod: Defines rules (e.g., "email must be valid format")
 * - zodResolver: Connects Zod validation to react-hook-form
 * 
 * DYNAMIC FIELDS:
 * - Pet Owner: Just basic info (name, email, phone, address)
 * - Veterinarian: Adds specialization and license number
 * - Administrator: Adds access level (standard/elevated/super_admin)
 * 
 * ROLE-BASED PERMISSIONS:
 * Uses RoleManager to determine:
 * - What user types current admin can create
 * - What access levels they can assign
 * - Prevents privilege escalation (can't create higher-level admins)
 * 
 * @param user - Existing user to edit (null for create mode)
 * @param onSubmit - Callback with form data when submitted
 * @param onCancel - Callback when user cancels
 * @param isLoading - Whether form is currently submitting
 * @param currentUser - The logged-in admin (for permission checking)
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { userFormSchema, UserFormData } from '../../schemas/userSchema';
import { User } from '../../types';
import { RoleManager, UserRole, AdminAccessLevel } from '../../utils/roleManagement';

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  currentUser: User;
}

export default function UserForm({ user, onSubmit, onCancel, isLoading = false, currentUser }: UserFormProps) {
  /**
   * REACT HOOK FORM SETUP
   * 
   * react-hook-form provides powerful form management:
   * - register: Connects input fields to form state
   * - handleSubmit: Wraps our submit function with validation
   * - setValue: Programmatically set field values
   * - watch: Monitor specific field values in real-time
   * - formState: Access validation errors and form status
   * 
   * VALIDATION:
   * - resolver: Uses Zod schema for validation rules
   * - mode: 'onChange' validates as user types (instant feedback)
   * - defaultValues: Pre-fills form when editing existing user
   */
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: user?.password || '',
      userType: user?.userType || 'pet_owner',
      address: user?.address || '',
      specialization: user?.specialization || '',
      licenseNumber: user?.licenseNumber || '',
      accessLevel: user?.accessLevel || ''
    }
  });

  // WATCH: Monitor userType field to show/hide conditional fields
  // When userType changes, form re-renders to show relevant fields
  const watchUserType = watch('userType');

  // WATCH: Monitor accessLevel for administrator users
  const watchAccessLevel = watch('accessLevel');

  // Initialize form values when user changes
  React.useEffect(() => {
    if (user) {
      setValue('userType', user.userType);
      setValue('accessLevel', user.accessLevel || '');
    }
  }, [user, setValue]);

  // Get available user types and access levels based on current user permissions
  const creatableUserTypes = RoleManager.getCreatableUserTypes(currentUser);
  const availableAccessLevels = RoleManager.getAvailableAccessLevels(currentUser);

  const handleFormSubmit = (data: UserFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            {...register('fullName')}
            placeholder="Enter full name"
            className={errors.fullName ? 'border-red-500' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-red-500">{errors.fullName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="Enter email address"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="Enter phone number"
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            placeholder="Enter password"
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="userType">User Type *</Label>
        <Select
          onValueChange={(value) => setValue('userType', value as 'pet_owner' | 'veterinarian' | 'administrator', { shouldValidate: true })}
          value={watchUserType}
        >
          <SelectTrigger className={errors.userType ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            {creatableUserTypes.includes('pet_owner') && (
              <SelectItem value="pet_owner">Pet Owner</SelectItem>
            )}
            {creatableUserTypes.includes('veterinarian') && (
              <SelectItem value="veterinarian">Veterinarian</SelectItem>
            )}
            {creatableUserTypes.includes('administrator') && (
              <SelectItem value="administrator">Administrator</SelectItem>
            )}
          </SelectContent>
        </Select>
        {errors.userType && (
          <p className="text-sm text-red-500">{errors.userType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register('address')}
          placeholder="Enter address"
          className={errors.address ? 'border-red-500' : ''}
          rows={3}
        />
        {errors.address && (
          <p className="text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>

      {/* Veterinarian-specific fields */}
      {watchUserType === 'veterinarian' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              {...register('specialization')}
              placeholder="Enter specialization"
              className={errors.specialization ? 'border-red-500' : ''}
            />
            {errors.specialization && (
              <p className="text-sm text-red-500">{errors.specialization.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              {...register('licenseNumber')}
              placeholder="Enter license number"
              className={errors.licenseNumber ? 'border-red-500' : ''}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-red-500">{errors.licenseNumber.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Administrator-specific fields */}
      {watchUserType === 'administrator' && availableAccessLevels.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="accessLevel">Access Level</Label>
          <Select
            onValueChange={(value) => setValue('accessLevel', value, { shouldValidate: true })}
            value={watchAccessLevel || 'standard'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select access level" />
            </SelectTrigger>
            <SelectContent>
              {availableAccessLevels.includes('standard') && (
                <SelectItem value="standard">{RoleManager.getAccessLevelDisplayName('standard')}</SelectItem>
              )}
              {availableAccessLevels.includes('elevated') && (
                <SelectItem value="elevated">{RoleManager.getAccessLevelDisplayName('elevated')}</SelectItem>
              )}
              {availableAccessLevels.includes('super_admin') && (
                <SelectItem value="super_admin">{RoleManager.getAccessLevelDisplayName('super_admin')}</SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.accessLevel && (
            <p className="text-sm text-red-500">{errors.accessLevel.message}</p>
          )}
          <p className="text-sm text-gray-500">
            Access level determines the administrative permissions for this user.
          </p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !isValid}
        >
          {isLoading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
