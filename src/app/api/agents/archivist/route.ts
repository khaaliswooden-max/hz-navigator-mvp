/**
 * API Route: /api/agents/archivist
 * ARCHIVIST Agent - Document Intelligence
 * 
 * Available tasks:
 * - generate_compliance_report: Generate comprehensive compliance report
 * - generate_employee_roster: Generate employee roster for HUBZone compliance
 * - generate_certification_package: Generate HUBZone certification package
 * - parse_document: Parse and extract data from documents
 * - extract_addresses: Extract addresses from text content
 * - index_document: Index a document for search
 * - search_documents: Search indexed documents
 * - generate_audit_package: Generate audit documentation package
 */

import { NextRequest, NextResponse } from 'next/server';
import { getArchivistAgent, agentTasks } from '@/lib/agents';

// GET: Get available tasks and agent info
export async function GET() {
  return NextResponse.json({
    agent: 'archivist',
    name: 'ARCHIVIST - Document Intelligence',
    description: 'Document parsing, evidence extraction, compliance document generation, and intelligent filing for HUBZone certification records',
    availableTasks: agentTasks.archivist,
    usage: {
      method: 'POST',
      body: {
        organizationId: 'required - Organization ID',
        taskType: 'required - One of the available tasks',
        '...input': 'Task-specific input parameters',
      },
    },
    taskParameters: {
      generate_compliance_report: { format: 'optional: json (default) | pdf' },
      generate_employee_roster: {},
      generate_certification_package: {},
      parse_document: { content: 'Document content', type: 'lease | utility_bill | employee_record' },
      extract_addresses: { content: 'Text content to extract addresses from' },
      index_document: {
        title: 'required',
        type: 'required',
        content: 'optional',
        metadata: 'optional object',
        tags: 'optional array',
      },
      search_documents: { query: 'Search query string' },
      generate_audit_package: { startDate: 'optional ISO date', endDate: 'optional ISO date' },
    },
  });
}

// POST: Execute an ARCHIVIST task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, taskType, ...input } = body;

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!taskType) {
      return NextResponse.json(
        { error: 'taskType is required', availableTasks: agentTasks.archivist },
        { status: 400 }
      );
    }

    // Validate task type
    if (!agentTasks.archivist.includes(taskType)) {
      return NextResponse.json(
        { error: `Invalid taskType. Available tasks: ${agentTasks.archivist.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the task
    const archivist = getArchivistAgent();
    const result = await archivist.execute(taskType, input, organizationId);

    return NextResponse.json({
      success: true,
      agent: 'archivist',
      taskType,
      organizationId,
      result,
    });
  } catch (error) {
    console.error('[ARCHIVIST API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Task execution failed' 
      },
      { status: 500 }
    );
  }
}



