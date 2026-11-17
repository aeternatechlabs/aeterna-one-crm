import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { BRANCHES } from '../../config/constants';

const DESTINATIONS = [
  'United Kingdom',
  'Australia',
  'Canada',
  'Germany',
  'United States',
  'Ireland',
  'New Zealand',
];

const INTAKES = [
  'Fall 2026',
  'Spring 2027',
  'Winter 2026',
  'Fall 2027',
];

export const NewStudentModal = ({
  isOpen,
  onClose,
  onSubmit,
  currentBranch,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    phone: '',
    programme: '',
    university: '',
    destination: 'United Kingdom',
    intake: 'Fall 2026',
    branch: currentBranch && currentBranch !== 'all' ? currentBranch : BRANCHES.BENGALURU,
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.studentName.trim()) newErrors.studentName = 'Student name is required';
    if (!formData.email.trim()) newErrors.email = 'Email address is required';
    if (!formData.programme.trim()) newErrors.programme = 'Target programme is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    onClose();
    setFormData({
      studentName: '',
      email: '',
      phone: '',
      programme: '',
      university: '',
      destination: 'United Kingdom',
      intake: 'Fall 2026',
      branch: currentBranch && currentBranch !== 'all' ? currentBranch : BRANCHES.BENGALURU,
      notes: '',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <UserPlus size={18} strokeWidth={2.2} style={{ color: 'var(--color-gold-600)' }} />
          <span>Add Candidate to Admissions Pipeline</span>
        </span>
      }
      maxWidth="580px"
      footer={
        <div className="modal-actions-row">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            <UserPlus size={15} strokeWidth={2.2} className="mr-1.5" />
            <span>Add Candidate</span>
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="student-form-grid">
        <Input
          label="Student Full Name *"
          name="studentName"
          placeholder="e.g. Priya Sharma"
          value={formData.studentName}
          onChange={handleChange}
          error={errors.studentName}
          required
        />

        <Input
          label="Email Address *"
          name="email"
          type="email"
          placeholder="priya.sharma@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required
        />

        <Input
          label="Phone Number"
          name="phone"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={handleChange}
        />

        <Input
          label="Target Programme *"
          name="programme"
          placeholder="e.g. MSc Data Analytics"
          value={formData.programme}
          onChange={handleChange}
          error={errors.programme}
          required
        />

        <Input
          label="Target University"
          name="university"
          placeholder="e.g. University of Edinburgh"
          value={formData.university}
          onChange={handleChange}
        />

        <Select
          label="Destination Country"
          id="destination"
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          options={DESTINATIONS.map((d) => ({ value: d, label: d }))}
        />

        <Select
          label="Target Intake"
          id="intake"
          name="intake"
          value={formData.intake}
          onChange={handleChange}
          options={INTAKES.map((i) => ({ value: i, label: i }))}
        />

        <Select
          label="Assigned Branch"
          id="branch"
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          options={[
            { value: BRANCHES.BENGALURU, label: 'Bengaluru' },
            { value: BRANCHES.MYSURU, label: 'Mysuru' },
            { value: BRANCHES.BELAGAVI, label: 'Belagavi' },
          ]}
        />
      </form>
    </Modal>
  );
};
