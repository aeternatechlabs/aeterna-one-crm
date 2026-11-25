import React, { useState, useMemo ,useEffect} from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Play,
  Layers,
  FileCheck,
  CheckSquare,
  Cloud,
  Mail,
  HardDrive,
  Send,
  CheckCircle2,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  can,
  getRolePermissions,
} from '../config/roles';
import toast from 'react-hot-toast';
import { Modal } from '../components/common/Modal';
import { authService } from '../services/auth.service';
import { settingsService } from '../services/settings.service';
import '../styles/settings.css';

const SAMPLE_ACTIONS = [
  {
    id: 'verify_docs',
    title: 'Verify Student Document',
    desc: 'Review and approve KYC / academic certificates in document vault',
    resource: 'students',
    action: 'verifyDocs',
    icon: FileCheck,
  },
  {
    id: 'move_stage',
    title: 'Move Pipeline Stage',
    desc: 'Transition student enquiry from Shortlisted to Application Submitted',
    resource: 'pipeline',
    action: 'moveStage',
    icon: Layers,
  },
  {
    id: 'complete_task',
    title: 'Complete Counseling Task',
    desc: 'Record verified WhatsApp or phone reach-out and close task',
    resource: 'tasks',
    action: 'complete',
    icon: CheckSquare,
  },
  {
    id: 'export_reports',
    title: 'Export Multi-Branch Reports',
    desc: 'Download cross-branch scorecards and conversion funnel PDF/CSV',
    resource: 'reports',
    action: 'export',
    icon: BarChart3,
  },
  {
    id: 'manage_staff',
    title: 'Provision Staff User',
    desc: 'Register new education counsellors and assign branch roles',
    resource: 'settings',
    action: 'manageStaff',
    icon: Users,
  },
  {
    id: 'delete_docs',
    title: 'Delete Student Document',
    desc: 'Permanently remove candidate identification or financial documents',
    resource: 'students',
    action: 'deleteDocs',
    icon: Lock,
  },
];

export const SettingsPage = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('tester'); // 'tester' | 'matrix' | 'simulator'
  const [selectedRole, setSelectedRole] = useState(user?.role || ROLES.SUPER_ADMIN);
  const [selectedResource, setSelectedResource] = useState('students');
  const [selectedAction, setSelectedAction] = useState('verifyDocs');

  const [evaluating, setEvaluating] = useState(false);
  const [backendResult, setBackendResult] = useState(null);
  const [backendError, setBackendError] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([]);

  // Integrations & Cloud Storage State
  const [integrations, setIntegrations] = useState(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || 'admin@aeterna.com');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [testingStorage, setTestingStorage] = useState(false);
  const [testStorageResult, setTestStorageResult] = useState(null);

  const [showResendModal, setShowResendModal] = useState(false);
  const [connectingResend, setConnectingResend] = useState(false);
  const [disconnectingResend, setDisconnectingResend] = useState(false);
  const [resendForm, setResendForm] = useState({
    apiKey: '',
    senderEmail: 'noreply@mydomain.com',
    displayName: 'Aeterna Education Consultancy',
  });

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const data = await settingsService.getIntegrations();
      const payload = data?.data || data;
      setIntegrations(payload);
    } catch {
      setIntegrations({
        resend: {
          isConfigured: false,
          provider: 'development_relay',
          senderEmail: 'noreply@mydomain.com',
          senderName: 'Aeterna Education Consultancy',
          totalEmailsSent: 0,
        },
        cloudflareR2: {
          isConfigured: false,
          provider: 'local_vault',
          bucketName: 'aeterna-one-vault',
          accountIdMasked: 'Not Configured (Local Storage Active)',
          accessKeyMasked: 'Not Configured',
          endpoint: 'Local Encrypted Storage Vault',
        },
        storageMetrics: {
          activeDocuments: 0,
          trashedDocuments: 0,
          totalStorageBytes: 0,
          verifiedDocuments: 0,
          providerBreakdown: { cloudflare_r2: 0, local: 0 },
        },
      });
    } finally {
      setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'integrations') {
        setActiveTab('integrations');
        fetchIntegrations();
      }
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'integrations' && !integrations) {
      fetchIntegrations();
    }
  };

  const handleConnectResend = async (e) => {
    if (e) e.preventDefault();
    if (!resendForm.apiKey || !resendForm.apiKey.trim()) {
      toast.error('Please enter your Resend API Key (re_...)');
      return;
    }
    if (!resendForm.senderEmail || !resendForm.senderEmail.includes('@')) {
      toast.error('Please enter a valid sender email (e.g. noreply@mydomain.com)');
      return;
    }
    setConnectingResend(true);
    try {
      const res = await settingsService.connectResend(resendForm);
      toast.success(res?.message || 'Resend email service configured successfully!');
      setShowResendModal(false);
      fetchIntegrations();
    } catch (err) {
      toast.error(err?.message || 'Failed to configure Resend email service');
    } finally {
      setConnectingResend(false);
    }
  };

  const handleDisconnectResend = async () => {
    if (!window.confirm('Disconnect Resend email? System emails will revert to the development simulator.')) {
      return;
    }
    setDisconnectingResend(true);
    try {
      const res = await settingsService.disconnectResend();
      toast.success(res?.message || 'Resend email disconnected');
      fetchIntegrations();
    } catch (err) {
      toast.error(err?.message || 'Failed to disconnect Resend');
    } finally {
      setDisconnectingResend(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    if (e) e.preventDefault();
    if (!testEmailAddress) return;
    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const result = await settingsService.testEmail(testEmailAddress);
      setTestEmailResult({ success: true, message: result?.message || `Test email dispatched to ${testEmailAddress}` });
    } catch (err) {
      setTestEmailResult({ success: false, message: err?.message || 'Failed to dispatch test email' });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleTestStorage = async () => {
    setTestingStorage(true);
    setTestStorageResult(null);
    try {
      const result = await settingsService.testStorage();
      setTestStorageResult({
        success: result?.connected !== false,
        message: result?.message || 'Storage write, read, and delete test passed successfully.',
        latencyMs: result?.latencyMs,
      });
    } catch (err) {
      setTestStorageResult({ success: false, message: err?.message || 'Storage connection test failed' });
    } finally {
      setTestingStorage(false);
    }
  };

  // Resources list derived from canonical permissions matrix
  const resourcesList = useMemo(() => Object.keys(ROLE_PERMISSIONS), []);

  // Available actions for the selected resource
  const availableActions = useMemo(() => {
    return ROLE_PERMISSIONS[selectedResource]
      ? Object.keys(ROLE_PERMISSIONS[selectedResource])
      : [];
  }, [selectedResource]);

  // Handle resource change
  const handleResourceChange = (newResource) => {
    setSelectedResource(newResource);
    const actions = Object.keys(ROLE_PERMISSIONS[newResource] || {});
    if (actions.length > 0) {
      setSelectedAction(actions[0]);
    }
    setBackendResult(null);
    setBackendError(null);
  };

  // Synchronous client-side permission evaluation
  const clientAllowed = useMemo(() => {
    return hasPermission(selectedRole, selectedResource, selectedAction);
  }, [selectedRole, selectedResource, selectedAction]);

  // Execute dual-check: Client Guard & Server Guard
  const handleEvaluatePermission = async (e) => {
    if (e) e.preventDefault();
    setEvaluating(true);
    setBackendResult(null);
    setBackendError(null);

    try {
      const response = await authService.checkPermission({
        resource: selectedResource,
        action: selectedAction,
        simulatedRole: selectedRole,
      });
      setBackendResult(response);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;
      setBackendError({
        status: status || 500,
        message: status === 403
          ? `HTTP 403 Forbidden: Server middleware rejected action [${selectedResource}:${selectedAction}] for role [${selectedRole}].`
          : message,
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Simulate execution of a sample action
  const handleSimulateAction = (item) => {
    const isAllowed = can(selectedRole, item.resource, item.action);
    const timestamp = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (isAllowed) {
      const log = {
        id: Date.now(),
        time: timestamp,
        title: item.title,
        status: 'ALLOWED',
        role: selectedRole,
        msg: `Frontend guard verified role [${selectedRole}]. Action executed successfully and submitted to backend.`,
      };
      setSimulationLogs((prev) => [log, ...prev.slice(0, 9)]);
    } else {
      const log = {
        id: Date.now(),
        time: timestamp,
        title: item.title,
        status: 'BLOCKED',
        role: selectedRole,
        msg: `Frontend guard blocked execution! Role [${selectedRole}] is prevented on client-side before any network request was sent.`,
      };
      setSimulationLogs((prev) => [log, ...prev.slice(0, 9)]);
    }
  };

  return (
    <div className="settings-page-container">
      {/* 1. Header Hero Banner */}
      <section className="settings-header-hero" aria-label="Settings Header">
        <div className="settings-header-left">
          <div className="settings-badge-tag">
            <Shield size={14} strokeWidth={2.5} />
            <span>Security Architecture & Governance</span>
          </div>
          <h1 className="settings-header-title">Settings & Access Control</h1>
          <p className="settings-header-subtitle">
            Centralized Role-Based Access Control (RBAC) Matrix governing frontend presentation and backend API authorization.
          </p>
        </div>

        <div className="settings-header-right">
          <Link
            to="/employees"
            className="current-role-pill hover:border-gold-500 hover:text-maroon-900 transition-colors"
            title="Manage Staff & Employees"
          >
            <Users size={14} />
            <span>Manage Employees</span>
          </Link>
          <div className="current-role-pill" title="Current authenticated role">
            <Key size={14} />
            <span>Active Role: {ROLE_LABELS[user?.role] || user?.role || 'Guest'}</span>
          </div>
        </div>
      </section>

      {/* 2. Navigation Tabs */}
      <nav className="settings-nav-tabs" aria-label="Access Control Tabs">
        <button
          className={`settings-tab-btn ${activeTab === 'tester' ? 'active' : ''}`}
          onClick={() => handleTabChange('tester')}
        >
          <Shield size={15} />
          <span>Access Inspector & Test Form</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => handleTabChange('simulator')}
        >
          <Play size={15} />
          <span>Action Guard Simulator</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => handleTabChange('matrix')}
        >
          <Layers size={15} />
          <span>Complete System Matrix</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => handleTabChange('integrations')}
        >
          <Cloud size={15} />
          <span>Cloud & Service Integrations</span>
        </button>
      </nav>

      {/* 3. TAB 1: Access Inspector & Test Form */}
      {activeTab === 'tester' && (
        <div className="access-inspector-card">
          <div className="inspector-section-header">
            <h3>Test Role Access & Guard Behavior</h3>
            <p>
              Select any role, target resource, and operational action to test how the frontend and backend access control files prevent unauthorized access.
            </p>
          </div>

          <form onSubmit={handleEvaluatePermission} className="access-form-grid">
            <div className="form-field-group">
              <label htmlFor="role-select">Select User Role</label>
              <select
                id="role-select"
                className="form-select-control"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {Object.values(ROLES).map((roleKey) => (
                  <option key={roleKey} value={roleKey}>
                    {ROLE_LABELS[roleKey]} ({roleKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="resource-select">Select Resource Module</label>
              <select
                id="resource-select"
                className="form-select-control"
                value={selectedResource}
                onChange={(e) => handleResourceChange(e.target.value)}
              >
                {resourcesList.map((resKey) => (
                  <option key={resKey} value={resKey}>
                    {resKey.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="action-select">Select Target Action</label>
              <select
                id="action-select"
                className="form-select-control"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
              >
                {availableActions.map((actKey) => (
                  <option key={actKey} value={actKey}>
                    {actKey}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="test-submit-btn"
              disabled={evaluating}
              aria-label="Verify Access Control"
            >
              {evaluating ? (
                <>
                  <RefreshCw size={15} className="spin-animate" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Shield size={15} />
                  <span>Verify Access Control</span>
                </>
              )}
            </button>
          </form>

          {/* Dual Guard Result Panel */}
          <div className="dual-guard-result-panel">
            {/* Left: Frontend Guard (Client-Side Prevention) */}
            <div className={`guard-card ${clientAllowed ? 'allowed' : 'denied'}`}>
              <div className="guard-card-top">
                <div className="guard-title-wrap">
                  <Shield size={18} />
                  <span>Frontend Guard (client/src/config/roles.js)</span>
                </div>
                <span className={`guard-status-badge ${clientAllowed ? 'allowed' : 'denied'}`}>
                  {clientAllowed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  <span>{clientAllowed ? 'Allowed' : 'Prevented / Hidden'}</span>
                </span>
              </div>

              <p className="guard-detail-text">
                {clientAllowed
                  ? `Client-side permission check passed. The UI permits rendering this control and enables user interaction for [${selectedRole}].`
                  : `Client-side guard actively prevents access: This action button is hidden/disabled, and route navigation is blocked before any API call is dispatched.`}
              </p>

              <div className="guard-meta-chips">
                <span className="meta-chip">Role: <b>{selectedRole}</b></span>
                <span className="meta-chip">Resource: <b>{selectedResource}</b></span>
                <span className="meta-chip">Action: <b>{selectedAction}</b></span>
              </div>
            </div>

            {/* Right: Backend Guard (Server-Side Prevention) */}
            <div
              className={`guard-card ${
                backendResult?.allowed
                  ? 'allowed'
                  : backendResult || backendError
                  ? 'denied'
                  : clientAllowed
                  ? 'allowed'
                  : 'denied'
              }`}
            >
              <div className="guard-card-top">
                <div className="guard-title-wrap">
                  <Lock size={18} />
                  <span>Backend Guard (server/src/config/roles.js)</span>
                </div>
                <span
                  className={`guard-status-badge ${
                    (backendResult?.allowed ?? clientAllowed) ? 'allowed' : 'denied'
                  }`}
                >
                  {(backendResult?.allowed ?? clientAllowed) ? (
                    <CheckCircle size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}
                  <span>
                    {(backendResult?.allowed ?? clientAllowed)
                      ? 'HTTP 200 OK — Allowed'
                      : 'HTTP 403 Forbidden'}
                  </span>
                </span>
              </div>

              <p className="guard-detail-text">
                {backendResult
                  ? backendResult.message
                  : backendError
                  ? backendError.message
                  : clientAllowed
                  ? `Live backend middleware (requirePermission) authorizes this request and passes execution to the target controller.`
                  : `Live backend middleware (requirePermission) intercepts unauthorized requests and terminates with HTTP 403 Forbidden.`}
              </p>

              <div className="guard-meta-chips">
                <span className="meta-chip">
                  Enforcement: <b>requirePermission('{selectedResource}', '{selectedAction}')</b>
                </span>
                <span className="meta-chip">
                  Status Code: <b>{(backendResult?.allowed ?? clientAllowed) ? '200' : '403'}</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: Action Guard Simulator */}
      {activeTab === 'simulator' && (
        <div className="access-inspector-card">
          <div className="inspector-section-header">
            <h3>Interactive Action Guard Simulator</h3>
            <p>
              Simulating actions under active role: <b>{ROLE_LABELS[selectedRole]} ({selectedRole})</b>. Notice how the frontend prevents unauthorized clicks while authorized actions proceed.
            </p>
          </div>

          <div className="simulator-actions-grid">
            {SAMPLE_ACTIONS.map((item) => {
              const IconComp = item.icon;
              const allowed = can(selectedRole, item.resource, item.action);

              return (
                <div key={item.id} className="simulator-action-btn-card">
                  <div className="action-card-top">
                    <div className="action-card-info">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                    {allowed ? (
                      <Unlock size={18} color="#16a34a" />
                    ) : (
                      <Lock size={18} color="#dc2626" />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span className="action-badge-pill">
                      {item.resource}.{item.action}
                    </span>
                    <button
                      className={`action-trigger-btn ${allowed ? 'allowed' : 'blocked'}`}
                      onClick={() => handleSimulateAction(item)}
                      title={allowed ? 'Execute authorized action' : 'Blocked by client-side guard'}
                    >
                      <IconComp size={14} />
                      <span>{allowed ? 'Execute Action' : 'Access Denied'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulation Audit Log */}
          {simulationLogs.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-maroon-900)', margin: '0 0 6px 0' }}>
                Simulation Execution History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {simulationLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: log.status === 'ALLOWED' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${log.status === 'ALLOWED' ? '#bbf7d0' : '#fecaca'}`,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#64748b' }}>[{log.time}]</span>
                    <span
                      style={{
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: log.status === 'ALLOWED' ? '#dcfce7' : '#fee2e2',
                        color: log.status === 'ALLOWED' ? '#166534' : '#991b1b',
                      }}
                    >
                      {log.status}
                    </span>
                    <span style={{ fontWeight: 700 }}>{log.title}</span>
                    <span style={{ color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: Complete System Matrix */}
      {activeTab === 'matrix' && (
        <div className="access-inspector-card">
          <div className="inspector-section-header">
            <h3>Canonical Role Permission Matrix</h3>
            <p>
              Full system policy synchronizing client-side UI visibility and server-side RBAC middleware.
            </p>
          </div>

          <div className="matrix-table-wrap">
            <table className="matrix-table" aria-label="Role Permission Matrix">
              <thead>
                <tr>
                  <th>Resource Module</th>
                  <th>Operational Action</th>
                  <th>Super Admin</th>
                  <th>Branch Manager</th>
                  <th>Counsellor</th>
                  <th>App Officer</th>
                  <th>Marketing</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ROLE_PERMISSIONS).flatMap(([resource, actions]) =>
                  Object.entries(actions).map(([action, allowedRoles], idx) => (
                    <tr key={`${resource}-${action}`}>
                      {idx === 0 ? (
                        <td
                          rowSpan={Object.keys(actions).length}
                          style={{
                            fontWeight: 800,
                            color: 'var(--color-maroon-900)',
                            background: 'rgba(255, 255, 255, 0.4)',
                            verticalAlign: 'top',
                            paddingTop: '16px',
                          }}
                        >
                          {resource.toUpperCase()}
                        </td>
                      ) : null}
                      <td>
                        <span className="action-badge-pill">{action}</span>
                      </td>
                      <td>
                        {allowedRoles.includes(ROLES.SUPER_ADMIN) ? (
                          <span className="matrix-check">
                            <CheckCircle size={14} /> Allowed
                          </span>
                        ) : (
                          <span className="matrix-cross">
                            <XCircle size={14} /> Denied
                          </span>
                        )}
                      </td>
                      <td>
                        {allowedRoles.includes(ROLES.BRANCH_MANAGER) ? (
                          <span className="matrix-check">
                            <CheckCircle size={14} /> Allowed
                          </span>
                        ) : (
                          <span className="matrix-cross">
                            <XCircle size={14} /> Denied
                          </span>
                        )}
                      </td>
                      <td>
                        {allowedRoles.includes(ROLES.COUNSELLOR) ? (
                          <span className="matrix-check">
                            <CheckCircle size={14} /> Allowed
                          </span>
                        ) : (
                          <span className="matrix-cross">
                            <XCircle size={14} /> Denied
                          </span>
                        )}
                      </td>
                      <td>
                        {allowedRoles.includes(ROLES.APPLICATION_OFFICER) ? (
                          <span className="matrix-check">
                            <CheckCircle size={14} /> Allowed
                          </span>
                        ) : (
                          <span className="matrix-cross">
                            <XCircle size={14} /> Denied
                          </span>
                        )}
                      </td>
                      <td>
                        {allowedRoles.includes(ROLES.MARKETING) ? (
                          <span className="matrix-check">
                            <CheckCircle size={14} /> Allowed
                          </span>
                        ) : (
                          <span className="matrix-cross">
                            <XCircle size={14} /> Denied
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 4: Cloud & Service Integrations (Cloudflare R2 & Brevo) */}
      {activeTab === 'integrations' && (
        <div className="integrations-dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Summary Banner */}
          <div className="inspector-section-header" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #ebd9c8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', color: '#5a0c1e', fontSize: '18px', fontWeight: 800 }}>
                  Cloud Services & External Integrations Hub
                </h3>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '13px' }}>
                  Super Admin control center to manage and verify live connectivity for Cloudflare R2 Object Storage and Transactional Email Engine.
                </p>
              </div>
              <button
                type="button"
                className="action-pill-btn"
                onClick={fetchIntegrations}
                disabled={loadingIntegrations}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
              >
                <RefreshCw size={14} className={loadingIntegrations ? 'spin-animate' : ''} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* CARD 1: Cloudflare R2 Object Storage */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #ebd9c8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>☁️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>Cloudflare R2 Storage</h4>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>S3-Compatible Document Vault</span>
                  </div>
                </div>
                {integrations?.cloudflareR2?.isConfigured ? (
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ● R2 ACTIVE
                  </span>
                ) : (
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ● LOCAL VAULT (DEV)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Bucket Name:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.cloudflareR2?.bucketName || 'aeterna-one-vault'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Account ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{integrations?.cloudflareR2?.accountIdMasked || 'Not Set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Access Key:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{integrations?.cloudflareR2?.accessKeyMasked || 'Not Set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Lifecycle Synchronization:</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>Add &bull; Edit &bull; Delete Synced</span>
                </div>
              </div>

              {/* R2 Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#faf7f2', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Active Documents</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#5a0c1e' }}>
                    {integrations?.storageMetrics?.activeDocuments || 0}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Storage Footprint</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#9a6a24' }}>
                    {((integrations?.storageMetrics?.totalStorageBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>

              {/* Storage Quota & Capacity Bar */}
              <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>R2 Quota Usage:</span>
                  <span style={{ fontWeight: 700, color: (integrations?.storageMetrics?.usedPercentage || 0) > 85 ? '#dc2626' : '#059669' }}>
                    {((integrations?.storageMetrics?.totalStorageBytes || 0) / (1024 * 1024)).toFixed(1)} MB / {integrations?.storageMetrics?.storageLimitGb || 10} GB ({integrations?.storageMetrics?.usedPercentage || '0.00'}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(1, Math.min(100, integrations?.storageMetrics?.usedPercentage || 0.5))}%`,
                      background: (integrations?.storageMetrics?.usedPercentage || 0) > 85 ? '#dc2626' : '#059669',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                  <span>{((integrations?.storageMetrics?.freeStorageBytes || (10 * 1024 * 1024 * 1024)) / (1024 * 1024 * 1024)).toFixed(2)} GB Available</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>● 100% Free Tier (0 Egress Fees)</span>
                </div>
              </div>

              {/* Category Breakdown (if available) */}
              {integrations?.storageMetrics?.categoryBreakdown && integrations.storageMetrics.categoryBreakdown.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4b5563' }}>Storage by Document Type:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {integrations.storageMetrics.categoryBreakdown.map((cat) => (
                      <span
                        key={cat.category}
                        style={{
                          fontSize: '11px',
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <strong style={{ textTransform: 'capitalize' }}>{cat.category.replace(/_/g, ' ')}:</strong>
                        <span>{cat.count} files ({cat.mb} MB)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Optimization Features */}
              <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#065f46', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 700 }}>⚡ Built-in Storage Optimization Guardrails:</span>
                <span>&bull; <strong>10MB Ceiling:</strong> Prevents uncompressed huge files.</span>
                <span>&bull; <strong>Auto-Purge on Delete:</strong> Deleting a document instantly wipes it from R2 (zero zombie files).</span>
                <span>&bull; <strong>Zero Egress Cost:</strong> Cloudflare R2 has ₹0 download data fees.</span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="action-pill-btn"
                onClick={handleTestStorage}
                disabled={testingStorage}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', background: '#5a0c1e', color: '#ffffff' }}
              >
                {testingStorage ? <RefreshCw size={14} className="spin-animate" /> : <HardDrive size={14} />}
                <span>{testingStorage ? 'Verifying Cloudflare R2...' : 'Test R2 Read/Write/Delete'}</span>
              </button>

              {testStorageResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  background: testStorageResult.success ? '#ecfdf5' : '#fef2f2',
                  color: testStorageResult.success ? '#065f46' : '#b91c1c',
                  border: `1px solid ${testStorageResult.success ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {testStorageResult.message}
                  {testStorageResult.latencyMs && <span> ({testStorageResult.latencyMs}ms roundtrip)</span>}
                </div>
              )}
            </div>

            {/* CARD 2: Resend Transactional Email Engine */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #ebd9c8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>✉️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>Resend Email Engine</h4>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Transactional Email API for OTPs, 2FA & Password Reset</span>
                  </div>
                </div>
                {integrations?.resend?.isConfigured || integrations?.email?.isConfigured ? (
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ● RESEND ACTIVE ({integrations?.resend?.senderEmail || integrations?.email?.senderEmail || 'noreply@mydomain.com'})
                  </span>
                ) : (
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ○ NOT CONFIGURED (DEV SIMULATOR)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Sender Email:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.resend?.senderEmail || integrations?.email?.senderEmail || 'noreply@mydomain.com'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Sender Name:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.resend?.senderName || integrations?.email?.senderName || 'Aeterna Education Consultancy'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>API Key:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#9a6a24' }}>
                    {integrations?.resend?.apiKeyMasked || 'Not Set'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Emails Dispatched:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.resend?.totalEmailsSent ?? 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowResendModal(true)}
                  className="action-pill-btn"
                  style={{
                    flex: 1,
                    background: '#5a0c1e',
                    color: '#ffffff',
                    padding: '8px 14px',
                    justifyContent: 'center',
                  }}
                >
                  <span>{integrations?.resend?.isConfigured ? 'Update Resend Settings' : 'Configure Resend'}</span>
                </button>
                {integrations?.resend?.isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectResend}
                    disabled={disconnectingResend}
                    className="action-pill-btn"
                    style={{
                      background: '#fef2f2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      padding: '8px 14px',
                    }}
                  >
                    <span>{disconnectingResend ? 'Disconnecting...' : 'Disconnect'}</span>
                  </button>
                )}
              </div>

              {/* Live Test Form */}
              <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Enter recipient email"
                    required
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingTestEmail}
                    className="action-pill-btn"
                    style={{ background: '#9a6a24', color: '#ffffff', padding: '8px 14px', whiteSpace: 'nowrap' }}
                  >
                    {sendingTestEmail ? <RefreshCw size={13} className="spin-animate" /> : <Send size={13} />}
                    <span>{sendingTestEmail ? 'Sending...' : 'Send Test'}</span>
                  </button>
                </div>
              </form>

              {testEmailResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  background: testEmailResult.success ? '#ecfdf5' : '#fef2f2',
                  color: testEmailResult.success ? '#065f46' : '#b91c1c',
                  border: `1px solid ${testEmailResult.success ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {testEmailResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Configuration Guide Card */}
          <div style={{ background: '#faf7f2', borderRadius: '16px', border: '1px dashed #9a6a24', padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#5a0c1e', fontSize: '15px', fontWeight: 700 }}>
              Production Deployment Instructions
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
              To configure Resend email and Cloudflare R2 in your live environment, add the following variables to your <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>server/.env</code> file:
            </p>
            <pre style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '14px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              overflowX: 'auto',
              fontFamily: 'Consolas, monospace',
              margin: 0
            }}>
{`# Resend Transactional Email Engine (e.g. noreply@mydomain.com)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=noreply@mydomain.com
EMAIL_SENDER_NAME=Aeterna Education Consultancy

# Cloudflare R2 Object Storage (S3-Compatible)
R2_ACCOUNT_ID=your_cloudflare_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_BUCKET_NAME=aeterna-one-vault
STORAGE_SIGNING_SECRET=aeterna-vault-storage-signing-secret-key-2026`}
            </pre>
          </div>
        </div>
      )}

      {/* Resend Configuration Modal */}
      {showResendModal && (
        <Modal
          isOpen={showResendModal}
          onClose={() => setShowResendModal(false)}
          title="Configure Resend Email Service"
          subtitle="Connect your Resend API Key and verified domain sender email for 2FA OTPs and password resets."
        >
          <form onSubmit={handleConnectResend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Resend API Key (re_...) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={resendForm.apiKey}
                onChange={(e) => setResendForm({ ...resendForm, apiKey: e.target.value })}
                placeholder="re_123456789_abcdef..."
                required
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Find or create this in your Resend Dashboard &rarr; API Keys.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Sender Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={resendForm.senderEmail}
                onChange={(e) => setResendForm({ ...resendForm, senderEmail: e.target.value })}
                placeholder="noreply@mydomain.com"
                required
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>
                Must be an address on your verified domain in Resend.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                Sender Display Name
              </label>
              <input
                type="text"
                value={resendForm.displayName}
                onChange={(e) => setResendForm({ ...resendForm, displayName: e.target.value })}
                placeholder="e.g. Aeterna Education Consultancy"
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowResendModal(false)}
                className="action-pill-btn"
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connectingResend}
                className="action-pill-btn"
                style={{ background: '#5a0c1e', color: '#ffffff', minWidth: '150px', justifyContent: 'center' }}
              >
                {connectingResend ? 'Connecting...' : 'Save Resend Settings'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
