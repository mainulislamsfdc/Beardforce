import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the pure utility functions extracted from workflowEngine
// (resolveValue, evaluateCondition) by testing them through the public API.
// For the workflow execution, we mock Supabase and test the step logic.

// Since workflowEngine imports supabase, which is mocked in setup.ts,
// we can test the exported workflowService.

describe('WorkflowEngine — Step Types', () => {
  // Test the condition evaluation logic via the workflow executor
  it('evaluates equality condition', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-1',
      user_id: 'test-user',
      name: 'Test Workflow',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        {
          id: 'step-1',
          type: 'condition' as const,
          config: { field: 'status', operator: '=', value: 'active' },
        },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    const result = await workflowService.executeWorkflow(workflow, { status: 'active' });
    expect(result.success).toBe(true);
    expect(result.stepsExecuted).toBe(1);
    expect(result.results[0].passed).toBe(true);
  });

  it('stops on false condition', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-2',
      user_id: 'test-user',
      name: 'Condition Stop',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        {
          id: 'cond',
          type: 'condition' as const,
          config: { field: 'score', operator: '>', value: '80' },
        },
        {
          id: 'after-cond',
          type: 'action' as const,
          action: 'log_change',
          config: { description: 'Should not run' },
        },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    // score=50 < 80, so condition fails and step 2 should NOT execute
    const result = await workflowService.executeWorkflow(workflow, { score: '50' });
    expect(result.success).toBe(true);
    expect(result.stepsExecuted).toBe(1); // Only the condition step
    expect(result.results[0].passed).toBe(false);
  });

  it('handles numeric comparisons', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const makeWorkflow = (operator: string, value: string) => ({
      id: `wf-num-${operator}`,
      user_id: 'test-user',
      name: 'Numeric',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        { id: 's1', type: 'condition' as const, config: { field: 'amount', operator, value } },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    });

    const r1 = await workflowService.executeWorkflow(
      makeWorkflow('>=', '100'),
      { amount: '150' }
    );
    expect(r1.results[0].passed).toBe(true);

    const r2 = await workflowService.executeWorkflow(
      makeWorkflow('<', '100'),
      { amount: '150' }
    );
    expect(r2.results[0].passed).toBe(false);
  });

  it('handles contains condition', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-contains',
      user_id: 'test-user',
      name: 'Contains',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        {
          id: 's1',
          type: 'condition' as const,
          config: { field: 'email', operator: 'contains', value: '@example.com' },
        },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    const r = await workflowService.executeWorkflow(workflow, { email: 'user@example.com' });
    expect(r.results[0].passed).toBe(true);
  });

  it('delay steps return skipped', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-delay',
      user_id: 'test-user',
      name: 'Delay',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        { id: 's1', type: 'delay' as const, config: { duration: '5m' } },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    const r = await workflowService.executeWorkflow(workflow, {});
    expect(r.results[0].skipped).toBe(true);
    expect(r.results[0].duration).toBe('5m');
  });
});

describe('WorkflowEngine — Integration Steps', () => {
  it('returns error when integrationId missing', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-int-err',
      user_id: 'test-user',
      name: 'Bad Integration',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        { id: 's1', type: 'integration' as const, config: {} },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    const r = await workflowService.executeWorkflow(workflow, {});
    expect(r.results[0].error).toMatch(/requires integrationId/);
  });
});

describe('WorkflowEngine — Agent Steps', () => {
  it('returns error when agentId missing', async () => {
    const { workflowService } = await import('../../services/workflowEngine');

    const workflow = {
      id: 'wf-agent-err',
      user_id: 'test-user',
      name: 'Bad Agent',
      description: '',
      trigger_type: 'manual',
      trigger_config: {},
      steps: [
        { id: 's1', type: 'agent' as const, config: {} },
      ],
      is_active: true,
      last_run_at: null,
      run_count: 0,
      created_at: '',
      updated_at: '',
    };

    const r = await workflowService.executeWorkflow(workflow, {});
    expect(r.results[0].error).toMatch(/requires agentId/);
  });
});
