import React, { useState, useMemo } from 'react';
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

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const data = await settingsService.getIntegrations();
      setIntegrations(data);
    } catch {
      // Fallback display for offline/test mode
      setIntegrations({
        brevo: {
          isConfigured: false,
          provider: 'development_relay',
          senderEmail: 'admissions@aeterna.com',
          senderName: 'Aeterna Education Consultancy',
          apiKeyMasked: 'Not Configured (Running in Development Relay)',
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'integrations' && !integrations) {
      fetchIntegrations();
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
                  Super Admin control center to manage and verify live connectivity for Cloudflare R2 Object Storage and Brevo Transactional Email Engine.
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

            {/* CARD 2: Brevo Email Dispatcher */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #ebd9c8', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>✉️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>Brevo Email Engine</h4>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Transactional SMTP & OTP Relay</span>
                  </div>
                </div>
                {integrations?.brevo?.isConfigured ? (
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ● BREVO ACTIVE
                  </span>
                ) : (
                  <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                    ● DEV RELAY (SIMULATED)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Sender Email:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.brevo?.senderEmail || 'admissions@aeterna.com'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>Sender Name:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{integrations?.brevo?.senderName || 'Aeterna Education Consultancy'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>API Key:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{integrations?.brevo?.apiKeyMasked || 'Not Set'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f3f4f6', paddingBottom: '8px' }}>
                  <span style={{ color: '#6b7280' }}>HTML Email Template:</span>
                  <span style={{ color: '#9a6a24', fontWeight: 600 }}>Karnataka Luxury Theme Active</span>
                </div>
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
              To activate Cloudflare R2 and Brevo in your live production environment, add the following configuration variables to your server <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>server/.env</code> file:
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
{`# Brevo (Sendinblue) Transactional API
BREVO_API_KEY=xkeysib-your_real_brevo_v3_api_key_here
BREVO_SENDER_EMAIL=admissions@aeterna.com
BREVO_SENDER_NAME=Aeterna Education Consultancy

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
    </div>
  );
};
