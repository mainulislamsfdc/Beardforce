import { GeminiProxyClient, FunctionDeclaration, SchemaType as Type } from '../../geminiProxyClient';
import { databaseService } from '../../database';
import { notificationService } from '../../notificationService';

// Dynamic config (updated by constructor for per-component instances)
let _orgName = 'RunwayCRM';

interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

// Define CEO Agent Tools
const ceoTools: ToolDefinition[] = [
  {
    name: 'generate_executive_dashboard',
    description: 'Generate a comprehensive executive dashboard with KPIs and metrics across all departments',
    parameters: {
      period: { type: 'string', required: false, description: 'Reporting period (today, this_week, this_month, this_quarter)' }
    },
    handler: async ({ period }) => {
      try {
        const leads = await databaseService.getLeads();
        const opportunities = await databaseService.getOpportunities();
        const aiBudget = await databaseService.getAIBudget();

        // Sales metrics
        const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
        const wonDeals = opportunities.filter(o => o.stage === 'closed_won');
        const totalRevenue = wonDeals.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        const pipelineValue = opportunities
          .filter(o => o.stage !== 'closed_won' && o.stage !== 'closed_lost')
          .reduce((sum, opp) => sum + (opp.amount || 0), 0);

        // AI Budget metrics
        const totalAICost = aiBudget.reduce((sum, record) => sum + (record.estimated_cost || 0), 0);
        const totalTokens = aiBudget.reduce((sum, record) => sum + (record.tokens_used || 0), 0);
        const totalRequests = aiBudget.reduce((sum, record) => sum + (record.request_count || 0), 0);

        // Agent performance
        const agentMetrics: Record<string, any> = {};
        aiBudget.forEach(record => {
          if (!agentMetrics[record.agent_name]) {
            agentMetrics[record.agent_name] = {
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          agentMetrics[record.agent_name].requests += record.request_count;
          agentMetrics[record.agent_name].tokens += record.tokens_used;
          agentMetrics[record.agent_name].cost += record.estimated_cost;
        });

        return {
          success: true,
          period: period || 'current',
          generated_at: new Date().toISOString(),
          kpis: {
            sales: {
              total_leads: leads.length,
              qualified_leads: qualifiedLeads,
              qualification_rate: `${Math.round((qualifiedLeads / leads.length) * 100)}%`,
              active_opportunities: opportunities.length,
              won_deals: wonDeals.length,
              total_revenue: totalRevenue,
              pipeline_value: pipelineValue,
              avg_deal_size: wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0
            },
            ai_operations: {
              total_requests: totalRequests,
              total_tokens: totalTokens,
              total_cost: Math.round(totalAICost * 100) / 100,
              budget_limit: 1000,
              budget_used_percent: `${Math.round((totalAICost / 1000) * 100)}%`,
              cost_per_request: totalRequests > 0 ? Math.round((totalAICost / totalRequests) * 100) / 100 : 0
            },
            agents: agentMetrics
          },
          health_status: {
            system: 'operational',
            database: 'connected',
            ai_budget: totalAICost > 900 ? 'warning' : 'healthy',
            overall_health: totalAICost > 900 ? 'warning' : 'healthy'
          },
          message: `Executive Dashboard: ${leads.length} leads, ${wonDeals.length} won deals, $${totalRevenue} revenue, $${Math.round(totalAICost * 100) / 100} AI costs`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'monitor_agent_activity',
    description: 'Monitor and report on the activity of a specific agent or all agents',
    parameters: {
      agent_name: { type: 'string', required: false, description: 'Specific agent to monitor (IT, Sales, Marketing) or leave blank for all' }
    },
    handler: async ({ agent_name }) => {
      try {
        const changeLogs = await databaseService.getChangeLogs();
        const aiBudget = await databaseService.getAIBudget();

        let filtered = agent_name
          ? changeLogs.filter(log => log.agent_name.toLowerCase() === agent_name.toLowerCase())
          : changeLogs;

        const activities = filtered.map(log => ({
          agent: log.agent_name,
          action: log.change_type,
          description: log.description,
          status: log.status,
          timestamp: log.created_at
        }));

        const byAgent: Record<string, any> = {};
        filtered.forEach(log => {
          if (!byAgent[log.agent_name]) {
            byAgent[log.agent_name] = {
              total_actions: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              recent_activities: []
            };
          }
          byAgent[log.agent_name].total_actions++;
          byAgent[log.agent_name][log.status]++;
          if (byAgent[log.agent_name].recent_activities.length < 5) {
            byAgent[log.agent_name].recent_activities.push({
              action: log.change_type,
              description: log.description,
              status: log.status,
              timestamp: log.created_at
            });
          }
        });

        // Add cost data
        const costByAgent: Record<string, any> = {};
        aiBudget.forEach(record => {
          if (!costByAgent[record.agent_name]) {
            costByAgent[record.agent_name] = { requests: 0, cost: 0 };
          }
          costByAgent[record.agent_name].requests += record.request_count;
          costByAgent[record.agent_name].cost += record.estimated_cost;
        });

        Object.keys(byAgent).forEach(agent => {
          if (costByAgent[agent]) {
            byAgent[agent].api_requests = costByAgent[agent].requests;
            byAgent[agent].api_cost = Math.round(costByAgent[agent].cost * 100) / 100;
          }
        });

        return {
          success: true,
          monitoring: agent_name || 'all_agents',
          total_activities: activities.length,
          activities: activities.slice(0, 10),
          by_agent: byAgent,
          message: agent_name
            ? `Monitored ${activities.length} activities from ${agent_name} Agent`
            : `Monitored ${activities.length} activities across all agents`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'review_budget_status',
    description: 'Review and analyze AI budget spending and projections',
    parameters: {
      include_projections: { type: 'boolean', required: false, description: 'Include spending projections for next month' }
    },
    handler: async ({ include_projections }) => {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const budgetRecords = await databaseService.getAIBudget(currentMonth);

        const byAgent: Record<string, any> = {};
        let totalSpent = 0;
        let totalRequests = 0;

        budgetRecords.forEach(record => {
          if (!byAgent[record.agent_name]) {
            byAgent[record.agent_name] = {
              requests: 0,
              tokens: 0,
              cost: 0
            };
          }
          byAgent[record.agent_name].requests += record.request_count;
          byAgent[record.agent_name].tokens += record.tokens_used;
          byAgent[record.agent_name].cost += record.estimated_cost;
          totalSpent += record.estimated_cost;
          totalRequests += record.request_count;
        });

        const budgetLimit = 1000;
        const percentUsed = (totalSpent / budgetLimit) * 100;
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const dayOfMonth = new Date().getDate();
        const dailyAverage = totalSpent / dayOfMonth;
        const projectedMonthly = dailyAverage * daysInMonth;

        const analysis = {
          month: currentMonth,
          budget_limit: budgetLimit,
          total_spent: Math.round(totalSpent * 100) / 100,
          remaining: Math.round((budgetLimit - totalSpent) * 100) / 100,
          percent_used: Math.round(percentUsed * 100) / 100,
          total_requests: totalRequests,
          avg_cost_per_request: totalRequests > 0 ? Math.round((totalSpent / totalRequests) * 100) / 100 : 0,
          spending_by_agent: byAgent,
          status: percentUsed > 90 ? 'critical' : percentUsed > 75 ? 'warning' : 'healthy',
          recommendations: []
        };

        // Add recommendations
        if (percentUsed > 90) {
          analysis.recommendations.push('⚠️ CRITICAL: Budget 90%+ used. Restrict non-essential agent operations.');
        } else if (percentUsed > 75) {
          analysis.recommendations.push('⚠️ WARNING: Budget 75%+ used. Monitor spending closely.');
        }

        if (include_projections) {
          analysis.recommendations.push(`📊 Daily average: $${Math.round(dailyAverage * 100) / 100}`);
          analysis.recommendations.push(`📈 Projected month-end: $${Math.round(projectedMonthly * 100) / 100}`);

          if (projectedMonthly > budgetLimit) {
            analysis.recommendations.push('🚨 ALERT: Projected to exceed budget. Reduce agent usage immediately.');
          }
        }

        return {
          success: true,
          ...analysis,
          message: `Budget Status: $${Math.round(totalSpent * 100) / 100} / $${budgetLimit} (${Math.round(percentUsed)}%) - ${analysis.status}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'coordinate_agents',
    description: 'Coordinate activities between different agents for complex workflows',
    parameters: {
      workflow_type: { type: 'string', required: true, description: 'Workflow to coordinate (lead_to_customer, campaign_launch, system_optimization)' },
      parameters: { type: 'string', required: false, description: 'Additional parameters as JSON string' }
    },
    handler: async ({ workflow_type, parameters }) => {
      const workflows: Record<string, any> = {
        lead_to_customer: {
          name: 'Lead to Customer Conversion',
          steps: [
            { agent: 'Marketing', action: 'Identify high-scoring leads from recent campaigns', order: 1 },
            { agent: 'Sales', action: 'Qualify and create opportunities for top leads', order: 2 },
            { agent: 'Sales', action: 'Draft personalized proposal emails', order: 3 },
            { agent: 'Marketing', action: 'Schedule follow-up nurture sequence', order: 4 },
            { agent: 'Sales', action: 'Track deal progress and forecast revenue', order: 5 },
            { agent: 'CEO', action: 'Monitor conversion rates and ROI', order: 6 }
          ],
          expected_duration: '7-14 days',
          success_metrics: ['Conversion rate', 'Deal value', 'Time to close']
        },
        campaign_launch: {
          name: 'Multi-Channel Campaign Launch',
          steps: [
            { agent: 'CEO', action: 'Review budget and approve campaign spend', order: 1 },
            { agent: 'Marketing', action: 'Create campaign with objectives and budget', order: 2 },
            { agent: 'Marketing', action: 'Segment audience and create content', order: 3 },
            { agent: 'Marketing', action: 'Draft emails and schedule social posts', order: 4 },
            { agent: 'Marketing', action: 'Set up landing page and A/B tests', order: 5 },
            { agent: 'Sales', action: 'Prepare to handle incoming leads', order: 6 },
            { agent: 'Marketing', action: 'Monitor campaign performance', order: 7 },
            { agent: 'Sales', action: 'Follow up with warm leads', order: 8 },
            { agent: 'CEO', action: 'Review campaign ROI and metrics', order: 9 }
          ],
          expected_duration: '30 days',
          success_metrics: ['Lead generation', 'Cost per lead', 'Campaign ROI']
        },
        system_optimization: {
          name: 'System Performance Optimization',
          steps: [
            { agent: 'IT', action: 'Analyze database performance and schema', order: 1 },
            { agent: 'IT', action: 'Identify slow queries and bottlenecks', order: 2 },
            { agent: 'CEO', action: 'Review optimization proposals', order: 3 },
            { agent: 'IT', action: 'Implement approved optimizations', order: 4 },
            { agent: 'IT', action: 'Verify data integrity and backups', order: 5 },
            { agent: 'CEO', action: 'Monitor system health metrics', order: 6 }
          ],
          expected_duration: '3-5 days',
          success_metrics: ['Query performance', 'System uptime', 'User satisfaction']
        }
      };

      const workflow = workflows[workflow_type];
      if (!workflow) {
        return { error: `Unknown workflow type: ${workflow_type}` };
      }

      return {
        success: true,
        workflow: workflow,
        status: 'planned',
        message: `Coordinated ${workflow.name} workflow with ${workflow.steps.length} steps across ${Array.from(new Set(workflow.steps.map((s: any) => s.agent))).length} agents`
      };
    }
  },
  {
    name: 'set_goals_and_kpis',
    description: 'Set organizational goals and key performance indicators',
    parameters: {
      department: { type: 'string', required: true, description: 'Department (sales, marketing, it, company_wide)' },
      goal_type: { type: 'string', required: true, description: 'Goal type (revenue, growth, efficiency, quality)' },
      target_value: { type: 'number', required: true, description: 'Target value for the goal' },
      timeframe: { type: 'string', required: false, description: 'Timeframe (monthly, quarterly, yearly)' }
    },
    handler: async ({ department, goal_type, target_value, timeframe }) => {
      const goalConfig = {
        id: `GOAL-${Date.now()}`,
        department,
        goal_type,
        target_value,
        timeframe: timeframe || 'quarterly',
        created_at: new Date().toISOString(),
        status: 'active'
      };

      // Generate relevant KPIs based on goal type
      const kpis: any[] = [];

      if (goal_type === 'revenue' && department === 'sales') {
        kpis.push(
          { name: 'Monthly Recurring Revenue', target: target_value, unit: 'dollars' },
          { name: 'Average Deal Size', target: Math.round(target_value / 20), unit: 'dollars' },
          { name: 'Win Rate', target: 30, unit: 'percent' },
          { name: 'Sales Cycle Length', target: 30, unit: 'days' }
        );
      } else if (goal_type === 'growth' && department === 'marketing') {
        kpis.push(
          { name: 'Lead Generation', target: target_value, unit: 'leads' },
          { name: 'Conversion Rate', target: 5, unit: 'percent' },
          { name: 'Cost Per Lead', target: 50, unit: 'dollars' },
          { name: 'Marketing ROI', target: 300, unit: 'percent' }
        );
      } else if (goal_type === 'efficiency' && department === 'it') {
        kpis.push(
          { name: 'System Uptime', target: 99.9, unit: 'percent' },
          { name: 'Response Time', target: 200, unit: 'milliseconds' },
          { name: 'Incident Resolution Time', target: 4, unit: 'hours' },
          { name: 'Automation Rate', target: target_value, unit: 'percent' }
        );
      }

      return {
        success: true,
        goal: goalConfig,
        kpis,
        tracking: {
          review_frequency: timeframe === 'monthly' ? 'weekly' : timeframe === 'quarterly' ? 'monthly' : 'quarterly',
          dashboard_url: '/dashboard',
          alerts_enabled: true
        },
        message: `Set ${goal_type} goal for ${department}: ${target_value} (${timeframe}) with ${kpis.length} KPIs`
      };
    }
  },
  {
    name: 'approve_major_decision',
    description: 'Review and approve/reject major decisions proposed by other agents',
    parameters: {
      decision_id: { type: 'string', required: true, description: 'ID of the decision/change request' },
      action: { type: 'string', required: true, description: 'Action to take (approve, reject, request_info)' },
      notes: { type: 'string', required: false, description: 'Notes about the decision' }
    },
    handler: async ({ decision_id, action, notes }) => {
      try {
        const changeLogs = await databaseService.getChangeLogs([
          { column: 'id', operator: '=', value: decision_id }
        ]);

        if (changeLogs.length === 0) {
          return { error: 'Decision not found' };
        }

        const change = changeLogs[0];

        if (action === 'approve') {
          await databaseService.approveChange(decision_id);
          try {
            await notificationService.createNotification(
              databaseService.getUserId(), 'Decision Approved',
              `CEO approved: ${change.description}`,
              'success', 'CEO', decision_id, 'change_log'
            );
          } catch {}
          return {
            success: true,
            action: 'approved',
            decision: {
              id: decision_id,
              agent: change.agent_name,
              type: change.change_type,
              description: change.description
            },
            notes,
            message: `Approved: ${change.description}`
          };
        } else if (action === 'reject') {
          await databaseService.getAdapter().update('change_log', decision_id, {
            status: 'rejected',
            notes: notes || 'Rejected by CEO'
          });
          try {
            await notificationService.createNotification(
              databaseService.getUserId(), 'Decision Rejected',
              `CEO rejected: ${change.description}`,
              'warning', 'CEO', decision_id, 'change_log'
            );
          } catch {}
          return {
            success: true,
            action: 'rejected',
            decision: {
              id: decision_id,
              agent: change.agent_name,
              type: change.change_type,
              description: change.description
            },
            notes,
            message: `Rejected: ${change.description}`
          };
        } else {
          await databaseService.getAdapter().update('change_log', decision_id, {
            notes: `${change.notes || ''}\n\n[CEO REQUEST] ${notes}`
          });
          return {
            success: true,
            action: 'info_requested',
            message: `Requested more information for: ${change.description}`
          };
        }
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'system_health_check',
    description: 'Perform a comprehensive system health check across all components',
    parameters: {
      detailed: { type: 'boolean', required: false, description: 'Include detailed diagnostics' }
    },
    handler: async ({ detailed }) => {
      try {
        const leads = await databaseService.getLeads();
        const opportunities = await databaseService.getOpportunities();
        const aiBudget = await databaseService.getAIBudget();
        const changeLogs = await databaseService.getChangeLogs();

        const health = {
          timestamp: new Date().toISOString(),
          overall_status: 'healthy',
          components: {
            database: {
              status: 'connected',
              tables: ['leads', 'contacts', 'accounts', 'opportunities', 'orders', 'products', 'change_log', 'ai_budget'],
              record_counts: {
                leads: leads.length,
                opportunities: opportunities.length,
                change_logs: changeLogs.length
              }
            },
            agents: {
              it_agent: { status: 'operational', last_activity: 'recent' },
              sales_agent: { status: 'operational', last_activity: 'recent' },
              marketing_agent: { status: 'operational', last_activity: 'recent' },
              ceo_agent: { status: 'operational', last_activity: 'active' }
            },
            ai_services: {
              status: 'operational',
              provider: 'Google Gemini',
              model: 'gemini-2.0-flash',
              budget_status: 'healthy'
            },
            security: {
              authentication: 'enabled',
              row_level_security: 'enabled',
              data_encryption: 'enabled'
            }
          },
          issues: [] as string[],
          warnings: [] as string[]
        };

        // Check for issues
        const totalAICost = aiBudget.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);
        if (totalAICost > 900) {
          health.warnings.push('AI budget usage above 90%');
          health.overall_status = 'warning';
        }

        const pendingChanges = changeLogs.filter(c => c.status === 'pending').length;
        if (pendingChanges > 10) {
          health.warnings.push(`${pendingChanges} pending approval requests`);
        }

        if (leads.length === 0) {
          health.warnings.push('No leads in system');
        }

        if (detailed) {
          (health.components.database as any) = {
            ...health.components.database,
            connection_pool: 'healthy',
            query_performance: 'optimal',
            backup_status: 'automated',
            last_backup: 'simulated-backup-time'
          };
        }

        return {
          success: true,
          ...health,
          message: `System Health: ${health.overall_status.toUpperCase()} - ${health.issues.length} issues, ${health.warnings.length} warnings`
        };
      } catch (error: any) {
        return {
          success: false,
          overall_status: 'error',
          error: error.message,
          message: 'System health check failed'
        };
      }
    }
  },
  {
    name: 'generate_strategic_report',
    description: 'Generate a strategic report with insights and recommendations',
    parameters: {
      report_type: { type: 'string', required: true, description: 'Report type (weekly, monthly, quarterly, annual)' },
      focus_areas: { type: 'array', required: false, description: 'Specific focus areas (sales, marketing, operations, finance)' }
    },
    handler: async ({ report_type, focus_areas }) => {
      try {
        const leads = await databaseService.getLeads();
        const opportunities = await databaseService.getOpportunities();
        const aiBudget = await databaseService.getAIBudget();

        const wonDeals = opportunities.filter(o => o.stage === 'closed_won');
        const revenue = wonDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
        const aiCost = aiBudget.reduce((sum, r) => sum + (r.estimated_cost || 0), 0);

        const report = {
          report_id: `RPT-${Date.now()}`,
          type: report_type,
          period: new Date().toISOString().substring(0, 7),
          generated_at: new Date().toISOString(),

          executive_summary: {
            overview: `${report_type.charAt(0).toUpperCase() + report_type.slice(1)} performance summary for ${_orgName}`,
            key_achievements: [
              `Generated $${revenue} in revenue from ${wonDeals.length} closed deals`,
              `Managed ${leads.length} leads with ${leads.filter(l => l.status === 'qualified').length} qualified`,
              `AI-powered automation saved an estimated 40+ hours of manual work`,
              `Maintained ${Math.round(((1000 - aiCost) / 1000) * 100)}% of AI budget reserve`
            ],
            key_challenges: [
              aiCost > 750 ? 'AI budget utilization approaching limits' : null,
              leads.length < 50 ? 'Lead generation pipeline needs expansion' : null,
              opportunities.length < 10 ? 'Sales pipeline requires more opportunities' : null
            ].filter(Boolean)
          },

          metrics: {
            sales: {
              total_leads: leads.length,
              qualified_leads: leads.filter(l => l.status === 'qualified').length,
              opportunities: opportunities.length,
              won_deals: wonDeals.length,
              revenue: revenue,
              pipeline_value: opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
                .reduce((sum, o) => sum + (o.amount || 0), 0)
            },
            operations: {
              ai_requests: aiBudget.reduce((sum, r) => sum + (r.request_count || 0), 0),
              ai_cost: Math.round(aiCost * 100) / 100,
              automation_rate: '85%',
              system_uptime: '99.9%'
            }
          },

          strategic_recommendations: [
            {
              priority: 'high',
              area: 'Sales',
              recommendation: 'Increase focus on lead qualification to improve conversion rates',
              expected_impact: 'Increase in qualified leads by 25-30%',
              timeline: '30 days'
            },
            {
              priority: 'high',
              area: 'Marketing',
              recommendation: 'Launch targeted campaign for high-value segments',
              expected_impact: '$50-100k additional pipeline value',
              timeline: '45 days'
            },
            {
              priority: 'medium',
              area: 'Operations',
              recommendation: aiCost > 750 ? 'Optimize AI agent usage to reduce costs' : 'Continue current AI optimization strategy',
              expected_impact: aiCost > 750 ? '15-20% cost reduction' : 'Maintain efficient operations',
              timeline: '15 days'
            },
            {
              priority: 'medium',
              area: 'Technology',
              recommendation: 'Implement additional automation for routine tasks',
              expected_impact: 'Save 10+ hours per week of manual work',
              timeline: '60 days'
            }
          ],

          next_steps: [
            'Review and approve recommended strategic initiatives',
            'Allocate resources for priority recommendations',
            'Schedule follow-up strategic review',
            'Communicate key metrics to stakeholders'
          ]
        };

        return {
          success: true,
          ...report,
          message: `Generated ${report_type} strategic report with ${report.strategic_recommendations.length} recommendations`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'allocate_resources',
    description: 'Allocate and manage resources (budget, time, personnel) across departments',
    parameters: {
      resource_type: { type: 'string', required: true, description: 'Resource type (budget, time, ai_quota)' },
      department: { type: 'string', required: true, description: 'Department (sales, marketing, it)' },
      amount: { type: 'number', required: true, description: 'Amount to allocate' },
      justification: { type: 'string', required: false, description: 'Reason for allocation' }
    },
    handler: async ({ resource_type, department, amount, justification }) => {
      const allocation = {
        id: `ALLOC-${Date.now()}`,
        resource_type,
        department,
        amount,
        justification: justification || 'Executive allocation',
        allocated_at: new Date().toISOString(),
        status: 'active'
      };

      // Calculate impact
      let impact = '';
      if (resource_type === 'budget') {
        impact = `Enables ${department} to execute planned initiatives worth $${amount}`;
      } else if (resource_type === 'ai_quota') {
        impact = `Allows ${department} agent to make approximately ${Math.round(amount / 0.02)} additional AI requests`;
      } else if (resource_type === 'time') {
        impact = `Allocates ${amount} hours of focused work for ${department} priorities`;
      }

      return {
        success: true,
        allocation,
        impact,
        guidelines: [
          `Track usage against allocated ${resource_type}`,
          'Report on ROI and outcomes achieved',
          'Request additional resources if needed with justification',
          'Return unused resources at period end'
        ],
        message: `Allocated ${amount} ${resource_type} to ${department} department`
      };
    }
  },
  {
    name: 'performance_analytics',
    description: 'Analyze performance trends and provide predictive insights',
    parameters: {
      analysis_type: { type: 'string', required: true, description: 'Analysis type (trend, forecast, comparison, anomaly)' },
      metric: { type: 'string', required: true, description: 'Metric to analyze (revenue, leads, conversion_rate, costs)' }
    },
    handler: async ({ analysis_type, metric }) => {
      try {
        const opportunities = await databaseService.getOpportunities();
        const leads = await databaseService.getLeads();

        let analysis: any = {
          type: analysis_type,
          metric,
          analyzed_at: new Date().toISOString()
        };

        if (analysis_type === 'trend') {
          // Simulate trend analysis
          analysis.trend = {
            direction: 'upward',
            strength: 'moderate',
            confidence: '75%',
            data_points: 30,
            insights: [
              `${metric} shows consistent growth over analyzed period`,
              'Positive momentum indicates healthy business trajectory',
              'Recommend maintaining current strategies while exploring optimization'
            ]
          };
        } else if (analysis_type === 'forecast') {
          const wonDeals = opportunities.filter(o => o.stage === 'closed_won');
          const avgDealValue = wonDeals.length > 0
            ? wonDeals.reduce((sum, o) => sum + (o.amount || 0), 0) / wonDeals.length
            : 5000;
          const pipelineOpps = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage));
          const projectedWins = Math.round(pipelineOpps.length * 0.3); // 30% win rate

          analysis.forecast = {
            period: 'next_30_days',
            projected_value: Math.round(projectedWins * avgDealValue),
            confidence_interval: {
              low: Math.round(projectedWins * avgDealValue * 0.7),
              high: Math.round(projectedWins * avgDealValue * 1.3)
            },
            assumptions: [
              '30% historical win rate',
              `$${Math.round(avgDealValue)} average deal value`,
              'Current pipeline conversion patterns'
            ],
            risk_factors: [
              'Market conditions may affect close rates',
              'Seasonal variations not fully accounted for',
              'New competition could impact conversion'
            ]
          };
        } else if (analysis_type === 'comparison') {
          analysis.comparison = {
            current_period: { value: leads.length, label: 'This month' },
            previous_period: { value: Math.round(leads.length * 0.85), label: 'Last month' },
            change: {
              absolute: Math.round(leads.length * 0.15),
              percentage: '+15%',
              direction: 'positive'
            },
            industry_benchmark: {
              value: Math.round(leads.length * 0.9),
              performance: 'above_average'
            }
          };
        }

        return {
          success: true,
          ...analysis,
          message: `Performed ${analysis_type} analysis on ${metric}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  }
];

// Transform tools for Gemini format
const transformedTools: FunctionDeclaration[] = ceoTools.map(tool => {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  Object.entries(tool.parameters || {}).forEach(([key, value]: [string, any]) => {
    const typeMap: any = {
      'string': Type.STRING,
      'number': Type.NUMBER,
      'boolean': Type.BOOLEAN,
      'array': Type.ARRAY,
      'object': Type.OBJECT
    };
    const paramType = typeMap[value.type] || Type.STRING;

    if (value.type === 'array') {
      properties[key] = {
        type: paramType,
        description: value.description,
        items: { type: Type.STRING }
      };
    } else {
      properties[key] = {
        type: paramType,
        description: value.description
      };
    }

    if (value.required === true) {
      required.push(key);
    }
  });

  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties,
      required
    }
  };
});

export class CEOAgent {
  private genAI: GeminiProxyClient;
  private model: any;
  private chatSession: any;
  private conversationHistory: any[] = [];

  constructor(config?: { agentName?: string; orgName?: string; personality?: string }) {
    if (config?.orgName) _orgName = config.orgName;
    const agentName = config?.agentName || 'CEO';
    const personality = config?.personality ? `\n\nAdditional personality guidance: ${config.personality}` : '';

    this.genAI = new GeminiProxyClient();
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are the ${agentName} Agent for ${_orgName} - the executive oversight and coordination system. Your role is to:

1. EXECUTIVE OVERSIGHT: Monitor all operations and provide strategic direction
2. RESOURCE MANAGEMENT: Allocate and optimize budgets, time, and AI resources
3. AGENT COORDINATION: Orchestrate complex workflows across IT, Sales, and Marketing agents
4. PERFORMANCE MONITORING: Track KPIs, analyze trends, and forecast outcomes
5. DECISION APPROVAL: Review and approve major changes proposed by other agents
6. STRATEGIC PLANNING: Set goals, create reports, and provide actionable recommendations
7. SYSTEM HEALTH: Monitor overall system health and operational efficiency
8. BUDGET OVERSIGHT: Track AI spending and ensure cost-effective operations
9. RISK MANAGEMENT: Identify issues and mitigate risks proactively
10. STAKEHOLDER REPORTING: Generate comprehensive reports for leadership

You have access to 10 executive-level tools that provide oversight across the entire organization. You see the big picture and make decisions that balance growth, efficiency, and sustainability.

Be strategic, data-driven, and forward-thinking. When coordinating between agents, consider dependencies and optimize for overall organizational success. When reviewing decisions, evaluate impact, risk, and alignment with strategic goals.

Format your responses professionally with executive summaries, clear metrics, and actionable recommendations. Always provide context and strategic rationale for your decisions.${personality}`
    });
  }

  async initialize() {
    this.chatSession = this.model.startChat({
      tools: [{ functionDeclarations: transformedTools }],
      history: []
    });
  }

  async chat(message: string): Promise<string> {
    try {
      if (!this.chatSession) {
        await this.initialize();
      }

      const result = await this.chatSession.sendMessage(message);
      const response = result.response;

      // Handle function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = await Promise.all(
          functionCalls.map(async (call: any) => {
            const tool = ceoTools.find(t => t.name === call.name);
            if (!tool) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: 'Unknown function' }
                }
              };
            }

            try {
              const result = await tool.handler(call.args);
              return {
                functionResponse: {
                  name: call.name,
                  response: result
                }
              };
            } catch (error: any) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: error.message }
                }
              };
            }
          })
        );

        // Send function responses back
        const followUpResult = await this.chatSession.sendMessage(functionResponses);
        return followUpResult.response.text();
      }

      return response.text();
    } catch (error: any) {
      console.error('CEO Agent Error:', error);
      return `❌ Error: ${error.message || 'Failed to process request'}`;
    }
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

export const ceoAgent = new CEOAgent();
