const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { Lead, LEAD_STATUSES, PRIORITY_LEVELS } = require('../src/modules/leads/lead.model');
const PipelineStudent = require('../src/modules/pipeline/pipeline.model');

describe('Milestone M2: Lead Management Engine', () => {
  describe('1. Model Validation & Schema Integrity', () => {
    it('Lead model instantiates with required fields and defaults', () => {
      const lead = new Lead({
        name: 'Aarav Patel',
        phone_number: '+91 98450 11223',
        email: 'aarav.patel@gmail.com',
        destination_country: 'Canada',
        study_level: "Master's",
      });

      assert.equal(lead.name, 'Aarav Patel');
      assert.equal(lead.phone_number, '+91 98450 11223');
      assert.equal(lead.current_status, 'New');
      assert.equal(lead.priority, 'medium');
      assert.equal(lead.branch, 'bengaluru');
      assert.equal(lead.deletionStage, 'ACTIVE');
    });

    it('Lead model validation fails when name or phone_number is missing', () => {
      const lead = new Lead({});
      const err = lead.validateSync();

      assert.ok(err, 'Expected validation error');
      assert.ok(err.errors.name, 'Expected error for name');
      assert.ok(err.errors.phone_number, 'Expected error for phone_number');
    });

    it('Lead statuses enum strictly includes all 10 standard statuses from reference project', () => {
      const expectedStatuses = [
        'New',
        'Assigned',
        'No Answer',
        'Only WhatsApp',
        'Interested',
        'Not Interested',
        'Follow Up',
        'Visited',
        'Deal Closed',
        'Confirm Visitor',
      ];

      for (const st of expectedStatuses) {
        assert.ok(LEAD_STATUSES.includes(st), `Expected status ${st} in LEAD_STATUSES`);
      }
    });

    it('Rejects invalid status not in permitted enum', () => {
      const lead = new Lead({
        name: 'Invalid Status Test',
        phone_number: '+91 98450 99999',
        current_status: 'RandomBogusStatus',
      });
      const err = lead.validateSync();
      assert.ok(err);
      assert.ok(err.errors.current_status);
    });
  });

  describe('2. Pipeline Conversion Contract', () => {
    it('PipelineStudent model can instantiate with lead details upon conversion', () => {
      const candidate = new PipelineStudent({
        studentName: 'Sneha Rao',
        email: 'sneha.rao@gmail.com',
        phone: '+91 98860 33445',
        programme: "Master's Programme",
        university: 'University of Toronto',
        destination: 'Canada',
        intake: 'Fall 2026',
        branch: 'bengaluru',
        stage: 'new',
      });

      assert.equal(candidate.studentName, 'Sneha Rao');
      assert.equal(candidate.destination, 'Canada');
      assert.equal(candidate.stage, 'new');
    });
  });
});
