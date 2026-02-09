import { GoogleGenerativeAI, FunctionDeclaration, SchemaType as Type } from '@google/generative-ai';
import { databaseService } from '../../database';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface ToolDefinition {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

// Define Marketing Agent Tools
const marketingTools: ToolDefinition[] = [
  {
    name: 'create_campaign',
    description: 'Create a new marketing campaign with defined objectives and budget',
    parameters: {
      name: { type: 'string', required: true, description: 'Campaign name' },
      type: { type: 'string', required: true, description: 'Campaign type (email, social, ads, content, webinar)' },
      objective: { type: 'string', required: true, description: 'Campaign objective (awareness, leads, sales, engagement)' },
      budget: { type: 'number', required: false, description: 'Campaign budget in dollars' },
      start_date: { type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
      end_date: { type: 'string', required: false, description: 'End date (YYYY-MM-DD)' },
      description: { type: 'string', required: false, description: 'Campaign description' }
    },
    handler: async ({ name, type, objective, budget, start_date, end_date, description }) => {
      try {
        // Store campaign in a notes-like structure for now (we'd add campaigns table later)
        const campaignData = {
          campaign_id: `CAMP-${Date.now()}`,
          name,
          type,
          objective,
          budget: budget || 0,
          start_date: start_date || new Date().toISOString().split('T')[0],
          end_date: end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          description,
          created_at: new Date().toISOString()
        };

        return {
          success: true,
          campaign: campaignData,
          message: `Created ${type} campaign "${name}" with ${objective} objective and $${budget || 0} budget`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'segment_audience',
    description: 'Segment leads based on criteria for targeted marketing',
    parameters: {
      segment_name: { type: 'string', required: true, description: 'Name for this audience segment' },
      criteria: { type: 'string', required: true, description: 'Segmentation criteria (e.g., "beard_type=full", "score>50", "status=qualified")' }
    },
    handler: async ({ segment_name, criteria }) => {
      try {
        const allLeads = await databaseService.getLeads();

        // Simple criteria parsing (could be enhanced)
        let filtered = allLeads;
        if (criteria.includes('beard_type=')) {
          const beardType = criteria.split('beard_type=')[1].split(',')[0].trim();
          filtered = filtered.filter(lead => lead.beard_type === beardType);
        }
        if (criteria.includes('score>')) {
          const minScore = parseInt(criteria.split('score>')[1].split(',')[0].trim());
          filtered = filtered.filter(lead => lead.score > minScore);
        }
        if (criteria.includes('status=')) {
          const status = criteria.split('status=')[1].split(',')[0].trim();
          filtered = filtered.filter(lead => lead.status === status);
        }

        return {
          success: true,
          segment_name,
          criteria,
          count: filtered.length,
          leads: filtered.map(lead => ({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            score: lead.score,
            status: lead.status
          })),
          message: `Created segment "${segment_name}" with ${filtered.length} leads matching criteria: ${criteria}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'draft_marketing_email',
    description: 'Generate a professional marketing email with personalization',
    parameters: {
      email_type: { type: 'string', required: true, description: 'Type of email (newsletter, promotion, announcement, nurture, event_invite)' },
      subject_line: { type: 'string', required: true, description: 'Email subject line' },
      key_message: { type: 'string', required: true, description: 'Main message or offer' },
      call_to_action: { type: 'string', required: false, description: 'Desired call-to-action' }
    },
    handler: async ({ email_type, subject_line, key_message, call_to_action }) => {
      const templates: Record<string, string> = {
        newsletter: `Subject: ${subject_line}

Hi {{first_name}},

${key_message}

This month's highlights:
• Industry insights and trends
• Product updates and new features
• Customer success stories

${call_to_action || 'Read the full newsletter →'}

Best regards,
The BeardForce Team

P.S. You're receiving this because you're a valued member of our community.`,

        promotion: `Subject: ${subject_line}

Hi {{first_name}},

🎉 Special offer just for you!

${key_message}

This limited-time offer includes:
✓ Exclusive discount
✓ Priority support
✓ Extended features

${call_to_action || 'Claim Your Offer Now →'}

Don't miss out - offer ends soon!

Cheers,
The BeardForce Team`,

        announcement: `Subject: ${subject_line}

Hello {{first_name}},

We have exciting news to share!

${key_message}

What this means for you:
• Enhanced functionality
• Better user experience
• Increased value

${call_to_action || 'Learn More →'}

Thank you for being part of our journey!

Best,
The BeardForce Team`,

        nurture: `Subject: ${subject_line}

Hi {{first_name}},

${key_message}

We understand that choosing the right CRM solution is an important decision. That's why we want to provide you with all the information you need.

Here's what makes BeardForce different:
• AI-powered agents that work for you
• Intuitive interface
• Comprehensive features

${call_to_action || 'Schedule a Demo →'}

Have questions? Just reply to this email.

Warm regards,
The BeardForce Team`,

        event_invite: `Subject: ${subject_line}

Hi {{first_name}},

You're invited! 🎊

${key_message}

Event Details:
📅 Date: [Event Date]
🕐 Time: [Event Time]
📍 Location: [Event Location/Link]

${call_to_action || 'Register Now →'}

We'd love to see you there!

Best wishes,
The BeardForce Team`
      };

      return {
        success: true,
        email_type,
        subject_line,
        email_body: templates[email_type] || templates['newsletter'],
        personalization_tokens: ['{{first_name}}', '{{company}}', '{{last_interaction}}'],
        message: `Generated ${email_type} email with subject: "${subject_line}"`
      };
    }
  },
  {
    name: 'schedule_social_post',
    description: 'Schedule a social media post across platforms',
    parameters: {
      platforms: { type: 'array', required: true, description: 'Social platforms (twitter, linkedin, facebook, instagram)' },
      content: { type: 'string', required: true, description: 'Post content' },
      schedule_time: { type: 'string', required: false, description: 'Post schedule time (YYYY-MM-DD HH:MM)' },
      image_url: { type: 'string', required: false, description: 'URL of image to attach' }
    },
    handler: async ({ platforms, content, schedule_time, image_url }) => {
      try {
        const postId = `POST-${Date.now()}`;
        const scheduledTime = schedule_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Platform-specific content optimization
        const optimized = platforms.map((platform: string) => {
          let optimizedContent = content;
          if (platform === 'twitter' && content.length > 280) {
            optimizedContent = content.substring(0, 277) + '...';
          }
          if (platform === 'linkedin') {
            optimizedContent += '\n\n#BeardForce #CRM #SalesAutomation';
          }
          if (platform === 'instagram' && !image_url) {
            return { platform, warning: 'Instagram posts typically require an image' };
          }
          return {
            platform,
            content: optimizedContent,
            scheduled_time: scheduledTime,
            image_url,
            status: 'scheduled'
          };
        });

        return {
          success: true,
          post_id: postId,
          platforms: optimized,
          message: `Scheduled post to ${platforms.join(', ')} for ${scheduledTime}`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'create_lead_magnet',
    description: 'Generate ideas and structure for a lead magnet (ebook, guide, template, checklist)',
    parameters: {
      type: { type: 'string', required: true, description: 'Lead magnet type (ebook, guide, template, checklist, webinar, toolkit)' },
      topic: { type: 'string', required: true, description: 'Topic or theme' },
      target_audience: { type: 'string', required: false, description: 'Target audience description' }
    },
    handler: async ({ type, topic, target_audience }) => {
      const structures: Record<string, any> = {
        ebook: {
          title: `The Ultimate ${topic} Guide`,
          chapters: [
            { number: 1, title: `Introduction to ${topic}`, pages: '3-5' },
            { number: 2, title: 'The Complete Framework', pages: '8-12' },
            { number: 3, title: 'Step-by-Step Implementation', pages: '10-15' },
            { number: 4, title: 'Common Mistakes to Avoid', pages: '5-7' },
            { number: 5, title: 'Case Studies & Examples', pages: '8-10' },
            { number: 6, title: 'Resources & Next Steps', pages: '3-5' }
          ],
          estimated_pages: '37-54'
        },
        guide: {
          title: `${topic}: A Practical Guide`,
          sections: [
            'Executive Summary',
            'Background & Context',
            'Key Strategies',
            'Implementation Roadmap',
            'Tools & Resources',
            'Measuring Success'
          ]
        },
        checklist: {
          title: `${topic} Checklist`,
          items: [
            'Planning Phase (5-7 items)',
            'Execution Phase (8-10 items)',
            'Optimization Phase (5-7 items)',
            'Measurement Phase (3-5 items)'
          ],
          format: 'PDF with checkboxes'
        },
        template: {
          title: `${topic} Template`,
          components: [
            'Pre-filled framework',
            'Customizable sections',
            'Best practice examples',
            'Instructions for use'
          ],
          formats: ['Excel', 'Google Sheets', 'PDF']
        }
      };

      return {
        success: true,
        lead_magnet: {
          type,
          topic,
          target_audience: target_audience || 'Business professionals',
          structure: structures[type] || structures['guide'],
          landing_page_suggestions: {
            headline: `Free ${type}: Master ${topic}`,
            subheadline: `Everything you need to ${topic.toLowerCase()} like a pro`,
            bullet_points: [
              `Comprehensive ${type} covering all aspects of ${topic}`,
              'Proven strategies used by industry leaders',
              'Ready to implement immediately',
              'Absolutely free - no credit card required'
            ],
            cta: `Download Your Free ${type} Now`
          }
        },
        message: `Created ${type} structure for "${topic}" targeting ${target_audience || 'business professionals'}`
      };
    }
  },
  {
    name: 'analyze_campaign_performance',
    description: 'Analyze and report on marketing campaign performance',
    parameters: {
      campaign_name: { type: 'string', required: true, description: 'Name of the campaign to analyze' },
      metrics: { type: 'array', required: false, description: 'Specific metrics to analyze (opens, clicks, conversions, roi)' }
    },
    handler: async ({ campaign_name, metrics }) => {
      try {
        // Simulate campaign data (would come from real analytics in production)
        const mockData = {
          campaign_name,
          period: 'Last 30 days',
          email_metrics: {
            sent: 1500,
            delivered: 1485,
            opens: 495,
            clicks: 148,
            conversions: 23,
            open_rate: '33.3%',
            click_rate: '9.9%',
            conversion_rate: '1.5%'
          },
          audience: {
            total_reached: 1485,
            engaged: 495,
            new_leads: 23
          },
          revenue: {
            total: 11500,
            cost: 450,
            roi: '2456%',
            cost_per_lead: 19.57,
            revenue_per_lead: 500
          },
          top_performing: {
            email_subject: 'Best performing subject line',
            day: 'Tuesday',
            time: '10:00 AM'
          },
          recommendations: [
            'Optimal send time: Tuesday-Thursday, 10 AM - 2 PM',
            'Subject lines with questions perform 15% better',
            'Personalized content increased engagement by 25%',
            'Mobile optimization boosted clicks by 18%'
          ]
        };

        return {
          success: true,
          ...mockData,
          message: `Campaign "${campaign_name}" generated ${mockData.revenue.total} revenue with ${mockData.revenue.roi} ROI`
        };
      } catch (error: any) {
        return { error: error.message };
      }
    }
  },
  {
    name: 'create_ab_test',
    description: 'Set up an A/B test for email subject lines or content',
    parameters: {
      test_name: { type: 'string', required: true, description: 'Name of the A/B test' },
      element_type: { type: 'string', required: true, description: 'What to test (subject_line, cta_button, email_content, landing_page)' },
      variant_a: { type: 'string', required: true, description: 'First variant' },
      variant_b: { type: 'string', required: true, description: 'Second variant' },
      sample_size: { type: 'number', required: false, description: 'Sample size per variant' }
    },
    handler: async ({ test_name, element_type, variant_a, variant_b, sample_size }) => {
      const testConfig = {
        test_id: `AB-${Date.now()}`,
        test_name,
        element_type,
        variants: [
          {
            name: 'Variant A (Control)',
            content: variant_a,
            sample_size: sample_size || 250,
            status: 'active'
          },
          {
            name: 'Variant B (Test)',
            content: variant_b,
            sample_size: sample_size || 250,
            status: 'active'
          }
        ],
        success_metric: element_type === 'subject_line' ? 'open_rate' : 'click_rate',
        duration: '7 days',
        confidence_level: '95%',
        created_at: new Date().toISOString()
      };

      return {
        success: true,
        ab_test: testConfig,
        recommendations: [
          'Run test for at least 7 days to gather sufficient data',
          'Ensure sample sizes are equal for statistical validity',
          'Monitor results daily but wait for completion before declaring winner',
          'Test only one element at a time for clear insights'
        ],
        message: `Created A/B test "${test_name}" for ${element_type} with ${sample_size || 250} samples per variant`
      };
    }
  },
  {
    name: 'optimize_landing_page',
    description: 'Analyze and provide recommendations for landing page optimization',
    parameters: {
      page_url: { type: 'string', required: false, description: 'Landing page URL' },
      goal: { type: 'string', required: true, description: 'Page goal (lead_capture, demo_request, purchase, signup)' }
    },
    handler: async ({ page_url, goal }) => {
      const recommendations = {
        page_url: page_url || 'Your landing page',
        goal,
        analysis: {
          headline: {
            current: '[Analyze current headline]',
            recommendations: [
              'Use action-oriented language',
              'Include specific benefit or outcome',
              'Keep it under 10 words',
              'Match the ad/email that brought them here'
            ]
          },
          cta: {
            placement: 'Above the fold + repeated at bottom',
            color: 'High contrast (test orange, green, or red)',
            text: goal === 'demo_request' ? 'Get Your Free Demo' : 'Start Free Trial',
            size: 'Large, prominent button (min 48px height)'
          },
          form: {
            fields: goal === 'lead_capture' ? ['Name', 'Email', 'Company'] : ['Name', 'Email', 'Phone', 'Company', 'Team Size'],
            optimization: [
              'Reduce form fields to minimum required',
              'Use inline validation for better UX',
              'Add privacy reassurance near submit button',
              'Consider multi-step form for longer forms'
            ]
          },
          social_proof: [
            'Add customer testimonials with photos',
            'Display company logos of clients',
            'Show real-time signup notifications',
            'Include case study results/metrics'
          ],
          mobile: [
            'Ensure responsive design',
            'Test on multiple devices',
            'Optimize load time (<3 seconds)',
            'Make buttons thumb-friendly (min 44x44px)'
          ]
        },
        conversion_boosters: [
          '🎯 Add clear value proposition in first 3 seconds',
          '🏆 Include trust badges and security certifications',
          '⏰ Create urgency with limited-time offers',
          '📊 Use visual hierarchy to guide attention',
          '🎥 Consider adding explainer video',
          '💬 Add live chat or chatbot support',
          '🚀 Optimize page load speed',
          '📱 Ensure mobile-first design'
        ],
        estimated_impact: {
          current_conversion_rate: '2.5%',
          potential_conversion_rate: '5-8%',
          uplift: '100-220%'
        }
      };

      return {
        success: true,
        ...recommendations,
        message: `Generated landing page optimization plan for ${goal} goal with potential 100-220% conversion uplift`
      };
    }
  },
  {
    name: 'plan_content_calendar',
    description: 'Generate a content calendar for social media and email marketing',
    parameters: {
      duration: { type: 'string', required: true, description: 'Calendar duration (1_week, 2_weeks, 1_month, 1_quarter)' },
      channels: { type: 'array', required: true, description: 'Marketing channels (email, blog, social, video)' },
      themes: { type: 'string', required: false, description: 'Content themes or topics' }
    },
    handler: async ({ duration, channels, themes }) => {
      const durationDays: Record<string, number> = {
        '1_week': 7,
        '2_weeks': 14,
        '1_month': 30,
        '1_quarter': 90
      };

      const days = durationDays[duration] || 30;
      const contentTypes = ['Educational', 'Promotional', 'Engagement', 'User-Generated', 'Behind-the-Scenes'];

      const calendar = [];
      for (let i = 0; i < Math.min(days, 30); i++) {
        const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        const post: any = {
          date: date.toISOString().split('T')[0],
          day: dayOfWeek,
          channels: []
        };

        if (channels.includes('email') && dayOfWeek === 'Tuesday') {
          post.channels.push({
            type: 'email',
            content_type: 'Newsletter',
            topic: themes || 'Weekly insights and updates'
          });
        }

        if (channels.includes('social')) {
          post.channels.push({
            type: 'social',
            platforms: ['LinkedIn', 'Twitter'],
            content_type: contentTypes[i % contentTypes.length],
            topic: themes || 'CRM tips and industry insights'
          });
        }

        if (channels.includes('blog') && [1, 8, 15, 22, 29].includes(i)) {
          post.channels.push({
            type: 'blog',
            content_type: 'Long-form article',
            topic: themes || 'In-depth CRM strategies'
          });
        }

        if (post.channels.length > 0) {
          calendar.push(post);
        }
      }

      return {
        success: true,
        duration,
        channels,
        themes: themes || 'General CRM and sales topics',
        calendar,
        posting_frequency: {
          email: 'Weekly (Tuesdays)',
          social: 'Daily',
          blog: 'Weekly',
          video: 'Bi-weekly'
        },
        message: `Created ${duration} content calendar with ${calendar.length} scheduled posts across ${channels.join(', ')}`
      };
    }
  },
  {
    name: 'integrate_google_ads',
    description: 'Set up and optimize Google Ads campaign configuration',
    parameters: {
      campaign_objective: { type: 'string', required: true, description: 'Campaign objective (leads, traffic, brand_awareness, sales)' },
      daily_budget: { type: 'number', required: true, description: 'Daily budget in dollars' },
      target_keywords: { type: 'array', required: true, description: 'Target keywords for the campaign' },
      location: { type: 'string', required: false, description: 'Geographic targeting' }
    },
    handler: async ({ campaign_objective, daily_budget, target_keywords, location }) => {
      // Calculate estimates
      const avgCPC = 2.5; // Average cost per click for CRM keywords
      const avgConversionRate = 0.03; // 3% conversion rate
      const clicksPerDay = Math.floor(daily_budget / avgCPC);
      const conversionsPerDay = Math.floor(clicksPerDay * avgConversionRate);

      const adGroups = [];
      const keywordGroups: Record<string, string[]> = {};

      // Group keywords by theme
      target_keywords.forEach((keyword: string) => {
        if (keyword.toLowerCase().includes('crm')) {
          if (!keywordGroups['CRM Solutions']) keywordGroups['CRM Solutions'] = [];
          keywordGroups['CRM Solutions'].push(keyword);
        } else if (keyword.toLowerCase().includes('sales')) {
          if (!keywordGroups['Sales Tools']) keywordGroups['Sales Tools'] = [];
          keywordGroups['Sales Tools'].push(keyword);
        } else {
          if (!keywordGroups['General']) keywordGroups['General'] = [];
          keywordGroups['General'].push(keyword);
        }
      });

      Object.entries(keywordGroups).forEach(([groupName, keywords]) => {
        adGroups.push({
          name: groupName,
          keywords: keywords,
          match_types: ['Exact', 'Phrase', 'Broad Match Modified'],
          suggested_bid: avgCPC,
          ad_copy: {
            headline_1: `Best ${groupName} | BeardForce`,
            headline_2: 'AI-Powered CRM Platform',
            headline_3: 'Start Free Trial Today',
            description_1: 'Transform your sales with AI agents. Automate lead management, forecasting, and more.',
            description_2: 'Join 1000+ companies using BeardForce. Free setup, no credit card required.',
            path_1: groupName.toLowerCase().replace(/\s+/g, '-'),
            path_2: 'free-trial'
          }
        });
      });

      return {
        success: true,
        campaign: {
          name: `BeardForce - ${campaign_objective}`,
          objective: campaign_objective,
          daily_budget,
          monthly_budget: daily_budget * 30,
          location: location || 'United States',
          ad_groups: adGroups,
          targeting: {
            devices: ['Desktop', 'Mobile', 'Tablet'],
            schedule: '24/7 (with bid adjustments)',
            audiences: ['In-market: Business Software', 'Affinity: Business Professionals']
          },
          projections: {
            daily_clicks: clicksPerDay,
            daily_conversions: conversionsPerDay,
            monthly_clicks: clicksPerDay * 30,
            monthly_conversions: conversionsPerDay * 30,
            cost_per_conversion: Math.round(daily_budget / conversionsPerDay)
          },
          optimization_tips: [
            'Add negative keywords to reduce wasted spend',
            'Use ad extensions (sitelinks, callouts, structured snippets)',
            'Implement conversion tracking from day one',
            'Set up remarketing campaigns for visitors',
            'Test responsive search ads with 10+ variations',
            'Monitor search terms weekly and adjust'
          ]
        },
        message: `Created Google Ads campaign for ${campaign_objective} with $${daily_budget}/day budget, targeting ${target_keywords.length} keywords. Estimated ${conversionsPerDay} conversions/day.`
      };
    }
  }
];

// Transform tools for Gemini format
const transformedTools: FunctionDeclaration[] = marketingTools.map(tool => {
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

export class MarketingAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatSession: any;
  private conversationHistory: any[] = [];

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are the Marketing Agent for BeardForce CRM. Your role is to:

1. CAMPAIGN MANAGEMENT: Create and optimize marketing campaigns across channels
2. AUDIENCE TARGETING: Segment audiences for personalized marketing
3. CONTENT CREATION: Draft compelling emails, social posts, and lead magnets
4. ANALYTICS: Analyze campaign performance and provide insights
5. A/B TESTING: Set up and manage A/B tests for optimization
6. LANDING PAGES: Optimize landing pages for maximum conversions
7. CONTENT CALENDAR: Plan and schedule content across channels
8. PAID ADVERTISING: Configure and optimize Google Ads campaigns
9. LEAD GENERATION: Create high-converting lead magnets and funnels
10. ROI TRACKING: Monitor and report on marketing ROI

You have access to 10 specialized marketing tools. Use data-driven insights and best practices to help users grow their business through effective marketing.

Be creative, strategic, and always focus on measurable results. When creating campaigns, be comprehensive. When analyzing performance, be honest about what's working and what needs improvement.

Format your responses with clear sections, bullet points, and actionable recommendations. Include relevant metrics and projections.`
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
            const tool = marketingTools.find(t => t.name === call.name);
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
      console.error('Marketing Agent Error:', error);
      return `❌ Error: ${error.message || 'Failed to process request'}`;
    }
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

export const marketingAgent = new MarketingAgent();
