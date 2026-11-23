import React from 'react';

export const StudentKeyFacts = ({ student, userRole }) => {
  if (!student) return null;

  // 1. Destination & Intakes
  const destinations =
    student.preferences?.destinationCountries?.length > 0
      ? student.preferences.destinationCountries.join(', ')
      : 'Not Specified';

  const intakes =
    student.preferences?.targetIntakes?.length > 0
      ? student.preferences.targetIntakes.join(', ')
      : 'Upcoming Intake';

  // 2. Degree Level & Programme
  const degreeLevel =
    student.preferences?.targetDegreeLevel?.toUpperCase() || 'POSTGRADUATE';
  const targetField =
    student.preferences?.targetFieldsOfStudy?.length > 0
      ? student.preferences.targetFieldsOfStudy.join(', ')
      : 'Undecided';

  // 3. Academic Summary
  const highestDegree = student.academics?.highestQualification || 'Undergraduate';
  const cgpa =
    student.academics?.undergradCgpa !== undefined && student.academics?.undergradCgpa !== null
      ? `${student.academics.undergradCgpa} CGPA`
      : 'Not Recorded';
  const backlogs = student.academics?.activeBacklogs || 0;

  // 4. Test Scores Summary
  const testRecord = student.testScores?.records?.[0];
  const testSummary = testRecord
    ? `${testRecord.testType.toUpperCase()} ${testRecord.overallScore || 'Pending'}`
    : 'No Tests Added';

  // 5. Budget & Loan Status (Role-sensitive display)
  const budgetCurrency = student.financial?.budgetCurrency || 'INR';
  const budgetFormatted =
    student.financial?.annualBudget > 0
      ? `${budgetCurrency} ${Number(student.financial.annualBudget).toLocaleString('en-IN')}`
      : 'Budget Pending';
  const loanStatus = student.financial?.loanStatus?.replace('_', ' ').toUpperCase() || 'NOT REQUIRED';

  // 6. Applications & Shortlist counts
  const shortlistCount = student.shortlist?.length || 0;
  const applicationCount = student.applications?.length || 0;

  return (
    <section className="student-key-facts-grid" aria-label="Key Facts Summary">
      <div className="key-fact-card">
        <span className="key-fact-label">Destination & Intake</span>
        <strong className="key-fact-value">{destinations}</strong>
        <span className="key-fact-subtext">Intake: {intakes}</span>
      </div>

      <div className="key-fact-card">
        <span className="key-fact-label">Degree & Specialization</span>
        <strong className="key-fact-value">{degreeLevel}</strong>
        <span className="key-fact-subtext">{targetField}</span>
      </div>

      <div className="key-fact-card">
        <span className="key-fact-label">Academics & CGPA</span>
        <strong className="key-fact-value">{cgpa}</strong>
        <span className="key-fact-subtext">
          {highestDegree} • {backlogs} backlogs
        </span>
      </div>

      <div className="key-fact-card">
        <span className="key-fact-label">Standardized Tests</span>
        <strong className="key-fact-value">{testSummary}</strong>
        <span className="key-fact-subtext">
          {testRecord?.isVerified ? '✓ Verified Score' : 'Self-Reported'}
        </span>
      </div>

      <div className="key-fact-card">
        <span className="key-fact-label">Financial Capability</span>
        <strong className="key-fact-value">{budgetFormatted}</strong>
        <span className="key-fact-subtext">Loan: {loanStatus}</span>
      </div>

      <div className="key-fact-card">
        <span className="key-fact-label">Pipeline Progression</span>
        <strong className="key-fact-value">
          {applicationCount} Applications
        </strong>
        <span className="key-fact-subtext">{shortlistCount} Shortlisted Universities</span>
      </div>
    </section>
  );
};
