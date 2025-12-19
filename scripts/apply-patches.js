#!/usr/bin/env node

/**
 * HZ Navigator - Patch Applicator
 * 
 * Automatically applies low/medium severity patches.
 * Requires review for high/critical patches.
 * 
 * Run with: node scripts/apply-patches.js [--auto] [--all]
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  projectRoot: process.cwd(),
  resultsDir: './feedback-results',
};

// Colors
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${c[color]}${msg}${c.reset}`);
}

// ============================================================
// PATCH TEMPLATES
// ============================================================

const TEMPLATES = {
  api_route: (methods) => `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

${methods.includes('GET') ? `export async function GET(request: NextRequest) {
  try {
    // TODO: Implement GET handler
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
` : ''}
${methods.includes('POST') ? `export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Implement POST handler
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
` : ''}`,

  page_component: (name) => `'use client';

import { useState, useEffect } from 'react';

export default function ${name}Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // TODO: Implement data loading
        setData({});
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">${name}</h1>
        {/* TODO: Implement page content */}
      </div>
    </div>
  );
}
`,

  tailwind_config: () => `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'hz-navy': '#1E3A5F',
        'hz-teal': '#2EA891',
        'hz-gold': '#D4A84B',
      },
    },
  },
  plugins: [],
};

export default config;
`,

  agents_index: () => `// HZ Navigator Agent System
// Central export for all AI agents

export * from './nexus/orchestrator';
export * from './sentinel/complianceMonitor';
export * from './cartograph/geospatialIntelligence';
export * from './workforce/employeeIntelligence';
export * from './capture/opportunityScanner';
export * from './advocate/regulatoryIntelligence';
export * from './guardian/auditDefense';
export * from './diplomat/partnershipIntelligence';
export * from './oracle/predictiveAnalytics';
export * from './archivist/documentIntelligence';

// Agent type for routing
export type AgentType = 
  | 'nexus'
  | 'sentinel'
  | 'cartograph'
  | 'workforce'
  | 'capture'
  | 'advocate'
  | 'guardian'
  | 'diplomat'
  | 'oracle'
  | 'archivist';
`,
};

// ============================================================
// PATCH APPLICATION
// ============================================================

function applyPatch(patch) {
  log(`\nApplying: ${patch.description}`, 'cyan');

  switch (patch.type) {
    case 'file_create':
      return createFile(patch);
    case 'schema_addition':
      return addToSchema(patch);
    case 'code_addition':
      return addCode(patch);
    case 'directory':
      return createDirectory(patch);
    case 'command':
      return runCommand(patch);
    case 'note':
      log(`  📝 Note: ${patch.note}`, 'yellow');
      return { applied: false, reason: 'Manual action required' };
    default:
      log(`  ⚠️ Unknown patch type: ${patch.type}`, 'yellow');
      return { applied: false, reason: 'Unknown patch type' };
  }
}

function createFile(patch) {
  const fullPath = path.join(CONFIG.projectRoot, patch.path);
  const dir = path.dirname(fullPath);

  // Create directory if needed
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`  📁 Created directory: ${dir}`, 'green');
  }

  // Check if file already exists
  if (fs.existsSync(fullPath)) {
    log(`  ⏭️ File already exists: ${patch.path}`, 'yellow');
    return { applied: false, reason: 'File exists' };
  }

  // Generate content based on template
  let content = '';
  
  if (patch.template === 'api_route' && patch.methods) {
    content = TEMPLATES.api_route(patch.methods);
  } else if (patch.path.includes('page.tsx')) {
    const name = path.dirname(patch.path).split('/').pop() || 'Page';
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    content = TEMPLATES.page_component(capitalizedName);
  } else if (patch.path.includes('tailwind.config')) {
    content = TEMPLATES.tailwind_config();
  } else if (patch.path.includes('agents/index')) {
    content = TEMPLATES.agents_index();
  } else {
    content = `// TODO: Implement ${patch.path}\n`;
  }

  fs.writeFileSync(fullPath, content);
  log(`  ✅ Created: ${patch.path}`, 'green');
  return { applied: true };
}

function addToSchema(patch) {
  const schemaPath = path.join(CONFIG.projectRoot, 'prisma/schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    log(`  ❌ Schema file not found`, 'red');
    return { applied: false, reason: 'Schema not found' };
  }

  let schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Check if model already exists
  if (schema.includes(`model ${patch.model}`)) {
    log(`  ⏭️ Model ${patch.model} already exists`, 'yellow');
    return { applied: false, reason: 'Model exists' };
  }

  // Add model at the end
  schema += `\n\n${patch.definition}\n`;
  fs.writeFileSync(schemaPath, schema);
  log(`  ✅ Added model: ${patch.model}`, 'green');
  return { applied: true };
}

function addCode(patch) {
  const fullPath = path.join(CONFIG.projectRoot, patch.file);
  
  if (!fs.existsSync(fullPath)) {
    log(`  ❌ File not found: ${patch.file}`, 'red');
    return { applied: false, reason: 'File not found' };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if code already exists
  if (content.includes(patch.code.trim().substring(0, 50))) {
    log(`  ⏭️ Code already exists`, 'yellow');
    return { applied: false, reason: 'Code exists' };
  }

  content += `\n${patch.code}\n`;
  fs.writeFileSync(fullPath, content);
  log(`  ✅ Added code to: ${patch.file}`, 'green');
  return { applied: true };
}

function createDirectory(patch) {
  const fullPath = path.join(CONFIG.projectRoot, patch.path);
  
  if (fs.existsSync(fullPath)) {
    log(`  ⏭️ Directory already exists`, 'yellow');
    return { applied: false, reason: 'Directory exists' };
  }

  fs.mkdirSync(fullPath, { recursive: true });
  log(`  ✅ Created directory: ${patch.path}`, 'green');
  return { applied: true };
}

function runCommand(patch) {
  try {
    const { execSync } = require('child_process');
    execSync(patch.command, { cwd: CONFIG.projectRoot, stdio: 'inherit' });
    log(`  ✅ Ran: ${patch.command}`, 'green');
    return { applied: true };
  } catch (error) {
    log(`  ❌ Command failed: ${error.message}`, 'red');
    return { applied: false, reason: 'Command failed' };
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const autoMode = args.includes('--auto');
  const applyAll = args.includes('--all');

  console.log('\n' + '═'.repeat(60));
  log('🔧 HZ NAVIGATOR - PATCH APPLICATOR', 'bold');
  console.log('═'.repeat(60) + '\n');

  // Find latest results file
  if (!fs.existsSync(CONFIG.resultsDir)) {
    log('❌ No feedback results found. Run feedback cycle first.', 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(CONFIG.resultsDir)
    .filter(f => f.startsWith('cycle-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    log('❌ No feedback cycle results found.', 'red');
    process.exit(1);
  }

  const latestFile = path.join(CONFIG.resultsDir, files[0]);
  const results = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

  log(`📄 Loading results from: ${files[0]}`, 'cyan');
  log(`   Total patches: ${results.patches.length}`);
  log(`   Auto-apply: ${results.autoApply.length}`);
  log(`   Require review: ${results.requireReview.length}`);

  // Determine which patches to apply
  const patchesToApply = applyAll 
    ? results.patches 
    : (autoMode ? results.autoApply : results.patches);

  const applied = [];
  const skipped = [];
  const failed = [];

  for (const patch of patchesToApply) {
    // Skip high/critical unless --all flag
    if (!applyAll && ['high', 'critical'].includes(patch.severity)) {
      skipped.push(patch);
      continue;
    }

    const result = applyPatch(patch);
    
    if (result.applied) {
      applied.push(patch);
    } else if (result.reason === 'Manual action required') {
      skipped.push(patch);
    } else {
      failed.push({ patch, reason: result.reason });
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  log('SUMMARY', 'bold');
  console.log('─'.repeat(60));
  log(`  ✅ Applied: ${applied.length}`, 'green');
  log(`  ⏭️ Skipped: ${skipped.length}`, 'yellow');
  log(`  ❌ Failed: ${failed.length}`, failed.length > 0 ? 'red' : 'green');

  if (applied.length > 0) {
    console.log('\n📝 Next steps:');
    console.log('   1. Review applied changes');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Run: npm run build');
    console.log('   4. Commit changes');
  }

  if (skipped.length > 0 && !autoMode) {
    console.log('\n⚠️  Skipped patches require manual review.');
    console.log('   Run with --all to apply all patches.');
  }

  console.log('\n');
}

main().catch(console.error);
