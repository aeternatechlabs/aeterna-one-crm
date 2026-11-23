import React, { useState } from 'react';
import {
  School,
  Building,
  Target,
  X,
  Plus,
  MapPin,
  User,
  Phone,
  Mail,
  Globe,
  Award,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { institutionService } from '../../services/institution.service';
import { BRANCHES } from '../../config/constants';

const DESTINATION_OPTIONS = [
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Germany',
  'Ireland',
  'New Zealand',
  'Singapore',
  'France',
];

const TYPE_CONFIGS = [
  {
    type: 'school',
    label: 'School',
    icon: School,
    desc: 'High School, K-12, CBSE, ICSE & International feeder schools',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    categoryPlaceholder: 'e.g. K-12 Senior Secondary & Pre-University',
    affiliationPlaceholder: 'e.g. CBSE / ICSE / IB World School',
  },
  {
    type: 'college',
    label: 'College',
    icon: Building,
    desc: 'Junior Colleges, Undergraduate Degree & Autonomous Colleges',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
    categoryPlaceholder: 'e.g. Autonomous Engineering & Commerce College',
    affiliationPlaceholder: 'e.g. VTU / Bangalore University / NAAC A++',
  },
  {
    type: 'coaching_institute',
    label: 'Coaching Institute',
    icon: Target,
    desc: 'IELTS, GRE, SAT, TOEFL, IIT-JEE & NEET preparation academies',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    categoryPlaceholder: 'e.g. Overseas Test Prep & Admissions Academy',
    affiliationPlaceholder: 'e.g. National Test Prep Chain / Independent Hub',
  },
];

export const AddInstitutionModal = ({ isOpen, onClose, onInstitutionCreated }) => {
  const [institutionType, setInstitutionType] = useState('school');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    board_or_affiliation: '',
    branch: BRANCHES.BENGALURU,
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '',
    contact_person: {
      name: '',
      designation: '',
      phone: '',
      email: '',
    },
    official_email: '',
    official_phone: '',
    website: '',
    student_intake_capacity: '',
    target_destinations: ['United Kingdom', 'United States', 'Canada', 'Australia'],
    partnership_status: 'Prospective',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentConfig = TYPE_CONFIGS.find((c) => c.type === institutionType) || TYPE_CONFIGS[0];

  const handleTypeChange = (type) => {
    setInstitutionType(type);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setError('');
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactPersonChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      contact_person: {
        ...prev.contact_person,
        [field]: value,
      },
    }));
  };

  const handleToggleDestination = (dest) => {
    setFormData((prev) => {
      const exists = prev.target_destinations.includes(dest);
      return {
        ...prev,
        target_destinations: exists
          ? prev.target_destinations.filter((d) => d !== dest)
          : [...prev.target_destinations, dest],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Institution name is required.');
      return;
    }

    if (!formData.city.trim()) {
      setError('City location is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        institution_type: institutionType,
        city: formData.city.trim(),
      };

      const res = await institutionService.createInstitution(payload);
      const created = res.institution || res.data?.institution;
      onInstitutionCreated?.(created);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create institution. Please inspect input.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-institution-modal-title"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-[#ebd9c8] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#5a0c1e] to-[#3e0714] px-6 py-4.5 border-b border-[#9a6a24]/30 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-[#9a6a24]/40 flex items-center justify-center text-[#ebd9c8]">
              <currentConfig.icon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-institution-modal-title" className="text-base sm:text-lg font-bold text-white tracking-wide">
                Add New Partner Institution
              </h2>
              <p className="text-xs text-[#ebd9c8] font-medium">
                Catalog Schools, Colleges & Coaching Centers for student pipelines & institutional partnerships
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution Type Selector Tabs */}
        <div className="bg-[#faf7f2] p-4 border-b border-[#ebd9c8] flex-shrink-0">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#5a0c1e] mb-2">
            Select Institution Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {TYPE_CONFIGS.map((cfg) => {
              const Icon = cfg.icon;
              const isSelected = institutionType === cfg.type;
              return (
                <button
                  key={cfg.type}
                  type="button"
                  onClick={() => handleTypeChange(cfg.type)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    isSelected
                      ? 'bg-white border-[#5a0c1e] shadow-md ring-2 ring-[#5a0c1e]/15'
                      : 'bg-white/70 border-[#decbb7] hover:bg-white hover:border-[#9a6a24]/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected ? 'bg-[#5a0c1e] text-white' : 'bg-[#faf7f2] text-[#5a0c1e]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{cfg.label}</span>
                      {isSelected && <span className="text-[10px] text-emerald-600 font-bold">Selected</span>}
                    </div>
                    <p className="text-[10.5px] text-gray-500 line-clamp-1 mt-0.5">{cfg.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SECTION 1: Basic Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9a6a24] flex items-center gap-1.5 border-b border-[#ebd9c8] pb-1">
              <Award className="w-3.5 h-3.5" /> 1. Institutional Identity & Affiliation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={`e.g. ${
                    institutionType === 'school'
                      ? 'National Public School (Indiranagar)'
                      : institutionType === 'college'
                      ? 'St. Joseph’s University / College (Bengaluru)'
                      : 'Career Launcher / IMS Test Prep Hub'
                  }`}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Classification / Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder={currentConfig.categoryPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Board / Affiliation / Franchise
                </label>
                <input
                  type="text"
                  value={formData.board_or_affiliation}
                  onChange={(e) => handleInputChange('board_or_affiliation', e.target.value)}
                  placeholder={currentConfig.affiliationPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Assigned Aeterna Hub / Branch *
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                >
                  <option value={BRANCHES.BENGALURU}>Bengaluru Hub</option>
                  <option value={BRANCHES.MYSURU}>Mysuru Hub</option>
                  <option value={BRANCHES.BELAGAVI}>Belagavi Hub</option>
                  <option value={BRANCHES.ALL}>All Karnataka Hubs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Partnership Status
                </label>
                <select
                  value={formData.partnership_status}
                  onChange={(e) => handleInputChange('partnership_status', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                >
                  <option value="Prospective">Prospective Lead</option>
                  <option value="Campus Visited">Campus / Center Visited</option>
                  <option value="Active MoU">Active MoU Signed</option>
                  <option value="Partner">Official Institutional Partner</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Location & Address */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9a6a24] flex items-center gap-1.5 border-b border-[#ebd9c8] pb-1">
              <MapPin className="w-3.5 h-3.5" /> 2. Location & Campus Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="e.g. Bengaluru"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Karnataka"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Annual Student Reach / Batch Size
                </label>
                <input
                  type="text"
                  value={formData.student_intake_capacity}
                  onChange={(e) => handleInputChange('student_intake_capacity', e.target.value)}
                  placeholder="e.g. 350 seniors / year"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Campus / Facility Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="e.g. #42, 100ft Road, Indiranagar, Bengaluru - 560038"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Point of Contact */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9a6a24] flex items-center gap-1.5 border-b border-[#ebd9c8] pb-1">
              <User className="w-3.5 h-3.5" /> 3. Primary Academic / Outreach Coordinator
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={formData.contact_person.name}
                  onChange={(e) => handleContactPersonChange('name', e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kulkarni"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.contact_person.designation}
                  onChange={(e) => handleContactPersonChange('designation', e.target.value)}
                  placeholder="e.g. Principal / Dean of Placements / Center Head"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={formData.contact_person.phone}
                  onChange={(e) => handleContactPersonChange('phone', e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Direct Email</label>
                <input
                  type="email"
                  value={formData.contact_person.email}
                  onChange={(e) => handleContactPersonChange('email', e.target.value)}
                  placeholder="coordinator@institution.edu.in"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Online Presence & Target Study Destinations */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9a6a24] flex items-center gap-1.5 border-b border-[#ebd9c8] pb-1">
              <Globe className="w-3.5 h-3.5" /> 4. Online Presence & Preferred Study Abroad Destinations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Official Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.institution.edu.in"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Official Central Phone</label>
                <input
                  type="text"
                  value={formData.official_phone}
                  onChange={(e) => handleInputChange('official_phone', e.target.value)}
                  placeholder="+91 80 2345 6789"
                  className="w-full px-3.5 py-2.5 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Popular Student Aspirations / Study Destinations
                </label>
                <div className="flex flex-wrap gap-2">
                  {DESTINATION_OPTIONS.map((dest) => {
                    const isSelected = formData.target_destinations.includes(dest);
                    return (
                      <button
                        key={dest}
                        type="button"
                        onClick={() => handleToggleDestination(dest)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#5a0c1e] text-white shadow-sm'
                            : 'bg-[#faf7f2] text-gray-700 border border-[#decbb7] hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {dest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Internal Counsellor Notes & Outreach Strategy
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="e.g. Conducted overseas seminar in August. High student demand for UK and German STEM courses."
                  className="w-full px-3.5 py-2 bg-[#faf7f2] border border-[#d9c7b8] rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5a0c1e]"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-[#ebd9c8] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#5a0c1e] hover:bg-[#4a0817] disabled:opacity-50 text-white text-xs font-bold tracking-wide rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Adding...' : `Add ${currentConfig.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
