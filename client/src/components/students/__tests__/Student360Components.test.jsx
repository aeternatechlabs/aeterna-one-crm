import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StudentHeader } from '../StudentHeader';
import { StudentKeyFacts } from '../StudentKeyFacts';
import { StudentTabs } from '../StudentTabs';
import { DocumentVault } from '../DocumentVault';
import { StudentSkeleton } from '../StudentSkeleton';
import { ROLES, BRANCHES } from '../../../config/constants';

describe('Student 360° UI Components Suite (Day 34)', () => {
  const mockStudent = {
    _id: '673a9876543210fedcba9876',
    studentId: 'AET-BLR-2026-X8F2',
    studentName: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    phone: '+919876543210',
    branch: BRANCHES.BENGALURU,
    status: 'active',
    assignedCounsellorName: 'Anita Rao',
    preferences: {
      destinationCountries: ['United Kingdom', 'Ireland'],
      targetDegreeLevel: 'masters',
      targetIntakes: ['Fall 2026'],
      targetFieldsOfStudy: ['Computer Science'],
    },
    academics: {
      highestQualification: 'B.Tech Information Technology',
      undergradCgpa: 8.75,
      activeBacklogs: 0,
      records: [
        {
          level: 'bachelors',
          institution: 'BMS College of Engineering',
          boardOrUniversity: 'VTU',
          yearOfPassing: 2025,
          score: '8.75 CGPA',
        },
      ],
    },
    testScores: {
      records: [
        {
          testType: 'ielts',
          overallScore: 7.5,
          isVerified: true,
          trfNumber: 'TRF99887766',
        },
      ],
    },
    financial: {
      annualBudget: 3500000,
      budgetCurrency: 'INR',
      fundingSource: 'education_loan',
      loanStatus: 'sanctioned',
      loanSanctionAmount: 3000000,
      sponsorDetails: {
        name: 'Mahesh Patel',
        relationship: 'Father',
        annualIncome: 1800000,
      },
    },
    shortlist: [
      {
        universityName: 'University of Edinburgh',
        programme: 'MSc Artificial Intelligence',
        country: 'United Kingdom',
        category: 'dream',
        status: 'shortlisted',
        tuitionFeeEstimated: 3200000,
      },
    ],
    applications: [
      {
        universityName: 'University of Manchester',
        programme: 'MSc Data Science',
        country: 'United Kingdom',
        status: 'submitted',
        portalApplicationId: 'APP-UK-2026-101',
      },
    ],
    notes: [
      {
        content: 'Candidate has completed IELTS with band 7.5. Shortlisted Edinburgh and Manchester.',
        category: 'counselling',
        authorName: 'Anita Rao',
        createdAt: new Date('2026-11-01T10:00:00Z'),
      },
    ],
    identity: {
      passport: {
        passportNumber: 'Z98765432',
      },
    },
  };

  it('StudentHeader renders student name, ID tag, branch pill, and triggers actions', async () => {
    const user = userEvent.setup();
    const handleAddNote = vi.fn();
    const handleBack = vi.fn();

    render(
      <StudentHeader
        student={mockStudent}
        onAddNote={handleAddNote}
        onBack={handleBack}
      />
    );

    expect(screen.getByText('Aarav Patel')).toBeInTheDocument();
    expect(screen.getByText('AET-BLR-2026-X8F2')).toBeInTheDocument();
    expect(screen.getByText(/bengaluru hq/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();

    const addNoteBtn = screen.getByRole('button', { name: /add note/i });
    await user.click(addNoteBtn);
    expect(handleAddNote).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByRole('button', { name: /back to directory/i });
    await user.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('StudentKeyFacts renders key factual summaries across destination, academics, tests, and budget', () => {
    render(<StudentKeyFacts student={mockStudent} userRole={ROLES.BRANCH_MANAGER} />);

    expect(screen.getByText('United Kingdom, Ireland')).toBeInTheDocument();
    expect(screen.getByText('MASTERS')).toBeInTheDocument();
    expect(screen.getByText('8.75 CGPA')).toBeInTheDocument();
    expect(screen.getByText('IELTS 7.5')).toBeInTheDocument();
    expect(screen.getByText(/35,00,000/)).toBeInTheDocument();
    expect(screen.getByText('1 Applications')).toBeInTheDocument();
  });

  it('StudentTabs switches between tabs and respects role-based field masking', async () => {
    const user = userEvent.setup();

    // 1. Counsellor view: masked passport number
    const { unmount } = render(
      <StudentTabs
        student={{
          ...mockStudent,
          identity: { passport: { passportNumber: '****5432' } },
        }}
        userRole={ROLES.COUNSELLOR}
      />
    );

    expect(screen.getByText('Overview & Identity')).toBeInTheDocument();
    expect(screen.getByText('****5432')).toBeInTheDocument();
    expect(screen.getByText(/(Masked PII)/i)).toBeInTheDocument();

    // Switch to Academic History tab
    const academicsTab = screen.getByRole('tab', { name: /academic history/i });
    await user.click(academicsTab);
    expect(screen.getByText('BMS College of Engineering')).toBeInTheDocument();

    // Switch to Shortlist tab
    const shortlistTab = screen.getByRole('tab', { name: /shortlist/i });
    await user.click(shortlistTab);
    expect(screen.getByText('University of Edinburgh')).toBeInTheDocument();

    unmount();
  });

  it('StudentSkeleton renders accessible shimmer placeholder', () => {
    render(<StudentSkeleton />);
    expect(screen.getByLabelText(/loading student profile/i)).toBeInTheDocument();
  });

  it('DocumentVault renders categories, gate summary, and respects verification RBAC', () => {
    const mockDocs = [
      {
        _id: 'doc1',
        title: 'Original Passport',
        fileName: 'passport.pdf',
        category: 'passport_identity',
        fileSize: 1024 * 500,
        mimeType: 'application/pdf',
        isVerified: true,
        verifiedByName: 'Vikram Officer',
        createdAt: new Date().toISOString(),
      },
    ];

    // 1. Manager view: has Verify / Mark Unverified controls
    const { rerender } = render(
      <DocumentVault
        student={mockStudent}
        userRole={ROLES.BRANCH_MANAGER}
        initialDocuments={mockDocs}
      />
    );

    expect(screen.getByText(/Student Document Vault & Compliance Gate/i)).toBeInTheDocument();
    expect(screen.getByText('Original Passport')).toBeInTheDocument();
    expect(screen.getByText(/Verified by Vikram Officer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark Unverified/i })).toBeInTheDocument();

    // 2. Counsellor view: Verify button is NOT rendered
    rerender(
      <DocumentVault
        student={mockStudent}
        userRole={ROLES.COUNSELLOR}
        initialDocuments={mockDocs}
      />
    );

    expect(screen.queryByRole('button', { name: /Mark Unverified/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /✓ Verify/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⬇ Download/i })).toBeInTheDocument();
  });
});
