const mongoose = require('mongoose');
const {
  BRANCHES,
  STUDENT_STATUS,
  TEST_SCORE_TYPES,
} = require('../../config/constants');

const qualificationRecordSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: {
        values: ['tenth', 'twelfth', 'diploma', 'bachelors', 'masters', 'doctorate', 'other'],
        message: 'Invalid qualification level: {VALUE}',
      },
      required: [true, 'Qualification level is required'],
    },
    institution: { type: String, trim: true, default: '' },
    boardOrUniversity: { type: String, trim: true, default: '' },
    yearOfPassing: { type: Number, min: 1980, max: 2040 },
    score: { type: String, trim: true, default: '' },
    gradingSystem: {
      type: String,
      enum: ['percentage', 'cgpa_10', 'cgpa_4', 'gpa', 'other'],
      default: 'percentage',
    },
    major: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const testScoreRecordSchema = new mongoose.Schema(
  {
    testType: {
      type: String,
      enum: {
        values: Object.values(TEST_SCORE_TYPES),
        message: 'Invalid test score type: {VALUE}',
      },
      required: [true, 'Test type is required'],
    },
    overallScore: { type: Number, min: 0 },
    subScores: {
      reading: { type: Number, min: 0 },
      writing: { type: Number, min: 0 },
      speaking: { type: Number, min: 0 },
      listening: { type: Number, min: 0 },
      quantitative: { type: Number, min: 0 },
      verbal: { type: Number, min: 0 },
      analyticalWriting: { type: Number, min: 0 },
    },
    testDate: { type: Date },
    validUntil: { type: Date },
    trfNumber: { type: String, trim: true, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { _id: true }
);

const shortlistItemSchema = new mongoose.Schema(
  {
    universityName: { type: String, required: [true, 'University name is required'], trim: true },
    programme: { type: String, required: [true, 'Programme is required'], trim: true },
    country: { type: String, required: [true, 'Country is required'], trim: true },
    category: {
      type: String,
      enum: ['dream', 'target', 'safe'],
      default: 'target',
    },
    applicationDeadline: { type: Date },
    tuitionFeeEstimated: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['considering', 'shortlisted', 'applying', 'applied', 'accepted', 'rejected', 'withdrawn'],
      default: 'shortlisted',
    },
  },
  { _id: true }
);

const applicationItemSchema = new mongoose.Schema(
  {
    universityName: { type: String, required: [true, 'University name is required'], trim: true },
    programme: { type: String, required: [true, 'Programme is required'], trim: true },
    country: { type: String, required: [true, 'Country is required'], trim: true },
    portalApplicationId: { type: String, trim: true, default: '' },
    submittedDate: { type: Date },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'conditional_offer',
        'unconditional_offer',
        'rejected',
        'deposit_paid',
        'cas_issued',
        'i20_issued',
        'visa_applied',
        'visa_granted',
        'visa_rejected',
        'enrolled',
      ],
      default: 'draft',
    },
    offerLetterDate: { type: Date },
    casI20Number: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const studentNoteSchema = new mongoose.Schema(
  {
    content: { type: String, required: [true, 'Note content is required'], trim: true },
    category: {
      type: String,
      enum: ['general', 'counselling', 'financial', 'visa', 'document', 'application'],
      default: 'general',
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, trim: true, default: 'Staff' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    // Unique human-readable Student Identifier (e.g. AET-BLR-2026-X8F2)
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // Physical Branch Containment
    branch: {
      type: String,
      enum: {
        values: [BRANCHES.BENGALURU, BRANCHES.MYSURU, BRANCHES.BELAGAVI],
        message: 'Invalid branch: {VALUE}',
      },
      required: [true, 'Branch is required'],
      index: true,
    },

    // Overall Lifecycle Status
    status: {
      type: String,
      enum: {
        values: Object.values(STUDENT_STATUS),
        message: 'Invalid student status: {VALUE}',
      },
      default: STUDENT_STATUS.ACTIVE,
      index: true,
    },

    // Root-level convenience and indexed identity fields
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },

    // Section 1: Detailed Identity & Contact (Tier 3 Sensitive PII)
    identity: {
      studentName: {
        type: String,
        trim: true,
        default: function () {
          return this.studentName || '';
        },
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: function () {
          return (this.email || '').toLowerCase().trim();
        },
      },
      phone: {
        type: String,
        trim: true,
        default: function () {
          return this.phone || '';
        },
      },
      dob: { type: Date },
      gender: {
        type: String,
        enum: ['male', 'female', 'non_binary', 'prefer_not_to_say', ''],
        default: '',
      },
      address: {
        street: { type: String, trim: true, default: '' },
        city: { type: String, trim: true, default: '' },
        state: { type: String, trim: true, default: '' },
        postalCode: { type: String, trim: true, default: '' },
        country: { type: String, trim: true, default: 'India' },
      },
      passport: {
        passportNumber: { type: String, trim: true, uppercase: true, default: '' },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        issuingCountry: { type: String, trim: true, default: 'India' },
      },
      emergencyContact: {
        name: { type: String, trim: true, default: '' },
        relationship: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, lowercase: true, default: '' },
      },
    },

    // Section 2: Academic History (Tier 2)
    academics: {
      highestQualification: { type: String, trim: true, default: '' },
      undergradCgpa: { type: Number, min: 0, max: 10 },
      activeBacklogs: { type: Number, default: 0, min: 0 },
      totalBacklogs: { type: Number, default: 0, min: 0 },
      records: [qualificationRecordSchema],
    },

    // Section 3: Standardized Test Scores (Tier 2)
    testScores: {
      records: [testScoreRecordSchema],
    },

    // Section 4: Budget & Financial Capability (Tier 4 Confidential Assets)
    financial: {
      annualBudget: { type: Number, default: 0, min: 0 },
      budgetCurrency: { type: String, trim: true, default: 'INR' },
      fundingSource: {
        type: String,
        enum: ['self_funded', 'education_loan', 'scholarship', 'family_sponsored', 'corporate_sponsored', 'undecided'],
        default: 'undecided',
      },
      loanStatus: {
        type: String,
        enum: ['not_required', 'planning', 'applied', 'sanctioned', 'disbursed'],
        default: 'not_required',
      },
      loanSanctionAmount: { type: Number, default: 0, min: 0 },
      sponsorDetails: {
        name: { type: String, trim: true, default: '' },
        relationship: { type: String, trim: true, default: '' },
        annualIncome: { type: Number, min: 0 },
        occupation: { type: String, trim: true, default: '' },
      },
    },

    // Section 5: Study Abroad Preferences (Tier 2)
    preferences: {
      destinationCountries: [{ type: String, trim: true }],
      targetDegreeLevel: {
        type: String,
        enum: ['bachelors', 'masters', 'pg_diploma', 'doctorate', 'certificate', 'undecided'],
        default: 'masters',
      },
      targetFieldsOfStudy: [{ type: String, trim: true }],
      targetIntakes: [{ type: String, trim: true }],
      visaRefusalHistory: {
        hasRefusal: { type: Boolean, default: false },
        details: { type: String, trim: true, default: '' },
        countries: [{ type: String, trim: true }],
      },
    },

    // Section 6: University Shortlist (Tier 2)
    shortlist: [shortlistItemSchema],

    // Section 7: Active Applications (Tier 2)
    applications: [applicationItemSchema],

    // Section 8: Internal Notes & Timeline (Tier 2)
    notes: [studentNoteSchema],

    // Assigned Staff
    assignedCounsellor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedCounsellorName: {
      type: String,
      trim: true,
      default: '',
    },
    assignedApplicationOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedApplicationOfficerName: {
      type: String,
      trim: true,
      default: '',
    },

    // Immutable Source Attribution (Lead Conversion Traceability)
    conversionSource: {
      originalLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PipelineStudent',
        index: true,
      },
      originalSource: {
        type: String,
        trim: true,
        default: 'admissions_pipeline',
      },
      convertedAt: {
        type: Date,
        default: Date.now,
      },
      convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      convertedByName: {
        type: String,
        trim: true,
        default: '',
      },
      conversionNotes: {
        type: String,
        trim: true,
        default: '',
      },
      initialStageAtConversion: {
        type: String,
        trim: true,
        default: '',
      },
      leadCreatedAt: {
        type: Date,
      },
    },

    // Soft-Delete & Privacy Erasure Lifecycle (DPDP Act 2023 / GDPR)
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deletionReason: {
      type: String,
      trim: true,
      default: '',
    },
    isAnonymized: {
      type: Boolean,
      default: false,
    },
    anonymizedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Synchronization pre-validate hook to ensure root fields and identity subdoc stay in sync
studentSchema.pre('validate', function () {
  if (this.studentName && (!this.identity || !this.identity.studentName)) {
    this.identity = this.identity || {};
    this.identity.studentName = this.studentName;
  }
  if (this.email && (!this.identity || !this.identity.email)) {
    this.identity = this.identity || {};
    this.identity.email = this.email.toLowerCase().trim();
  }
  if (this.phone && (!this.identity || !this.identity.phone)) {
    this.identity = this.identity || {};
    this.identity.phone = this.phone;
  }
});

// Compound Indexes for high-performance multi-tenant branch queries
studentSchema.index({ branch: 1, isDeleted: 1, status: 1 });
studentSchema.index({ branch: 1, email: 1 });
studentSchema.index({ branch: 1, studentName: 1 });
studentSchema.index({ 'conversionSource.originalLeadId': 1 });
studentSchema.index({ createdAt: -1 });

// Full-text search index across name, email, studentId, destination countries, and shortlist
studentSchema.index(
  {
    studentName: 'text',
    email: 'text',
    studentId: 'text',
    'preferences.destinationCountries': 'text',
    'shortlist.universityName': 'text',
  },
  { name: 'student_text_search' }
);

module.exports = mongoose.model('Student', studentSchema);
