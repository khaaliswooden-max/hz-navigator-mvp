#!/usr/bin/env node

/**
 * HZ Navigator - Real Feedback Cycle Executor
 * 
 * This script performs actual stress testing and generates
 * real patches based on discovered issues.
 * 
 * Run with: node scripts/execute-feedback-cycle.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  outputDir: './feedback-results',
  cycleNumber: Date.now(),
  autoApplySeverity: ['low', 'medium'], // Auto-apply these
  requireReviewSeverity: ['high', 'critical'], // Require human review
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  log(title, 'bold');
  console.log('═'.repeat(60) + '\n');
}

// ============================================================
// PHASE 1: FILE SYSTEM ANALYSIS
// ============================================================

function analyzeFileSystem() {
  logSection('📁 PHASE 1: FILE SYSTEM ANALYSIS');
  
  const issues = [];
  const findings = {
    missingFiles: [],
    missingDirectories: [],
    configIssues: [],
  };

  // Required files for HZ Navigator
  const requiredFiles = [
    { path: 'package.json', critical: true },
    { path: 'prisma/schema.prisma', critical: true },
    { path: 'src/app/layout.tsx', critical: true },
    { path: 'src/app/page.tsx', critical: true },
    { path: 'src/lib/prisma.ts', critical: true },
    { path: 'src/app/api/health/route.ts', critical: false },
    { path: 'src/app/dashboard/page.tsx', critical: false },
    { path: 'src/app/employees/page.tsx', critical: false },
    { path: 'src/app/map/page.tsx', critical: false },
    { path: 'src/agents/index.ts', critical: false },
    { path: '.env.local', critical: true },
    { path: 'tailwind.config.ts', critical: false },
  ];

  // Check each required file
  for (const file of requiredFiles) {
    const fullPath = path.join(CONFIG.projectRoot, file.path);
    if (!fs.existsSync(fullPath)) {
      findings.missingFiles.push(file);
      issues.push({
        id: `fs-missing-${file.path.replace(/\//g, '-')}`,
        category: 'bug',
        severity: file.critical ? 'critical' : 'medium',
        component: 'filesystem',
        description: `Missing required file: ${file.path}`,
        expectedBehavior: `File ${file.path} should exist`,
        actualBehavior: 'File not found',
        patch: generateFilePatch(file.path),
      });
    } else {
      log(`  ✓ ${file.path}`, 'green');
    }
  }

  // Check for common configuration issues
  if (fs.existsSync(path.join(CONFIG.projectRoot, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(CONFIG.projectRoot, 'package.json'), 'utf8'));
    
    // Check for required dependencies
    const requiredDeps = ['next', 'react', '@prisma/client', 'tailwindcss'];
    for (const dep of requiredDeps) {
      if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
        issues.push({
          id: `dep-missing-${dep}`,
          category: 'bug',
          severity: 'high',
          component: 'dependencies',
          description: `Missing required dependency: ${dep}`,
          expectedBehavior: `${dep} should be in dependencies`,
          actualBehavior: 'Dependency not found in package.json',
          patch: {
            type: 'command',
            command: `npm install ${dep}`,
          },
        });
      }
    }

    // Check for required scripts
    const requiredScripts = ['dev', 'build', 'start'];
    for (const script of requiredScripts) {
      if (!pkg.scripts?.[script]) {
        issues.push({
          id: `script-missing-${script}`,
          category: 'feature_gap',
          severity: 'medium',
          component: 'package.json',
          description: `Missing npm script: ${script}`,
          expectedBehavior: `npm run ${script} should be available`,
          actualBehavior: 'Script not defined',
          patch: {
            type: 'json_merge',
            file: 'package.json',
            merge: { scripts: { [script]: getDefaultScript(script) } },
          },
        });
      }
    }
  }

  // Check Prisma schema for required models
  const schemaPath = path.join(CONFIG.projectRoot, 'prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const requiredModels = ['Organization', 'Employee', 'AddressVerification', 'ComplianceSnapshot'];
    
    for (const model of requiredModels) {
      if (!schema.includes(`model ${model}`)) {
        issues.push({
          id: `schema-missing-${model}`,
          category: 'bug',
          severity: 'critical',
          component: 'prisma',
          description: `Missing Prisma model: ${model}`,
          expectedBehavior: `Model ${model} should be defined in schema.prisma`,
          actualBehavior: 'Model not found',
          patch: {
            type: 'schema_addition',
            model: model,
            definition: getModelDefinition(model),
          },
        });
      } else {
        log(`  ✓ Model: ${model}`, 'green');
      }
    }
  }

  log(`\nFile system issues found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  return issues;
}

// ============================================================
// PHASE 2: CODE QUALITY ANALYSIS
// ============================================================

function analyzeCodeQuality() {
  logSection('🔍 PHASE 2: CODE QUALITY ANALYSIS');
  
  const issues = [];

  // Find all TypeScript/JavaScript files
  const tsFiles = findFiles(CONFIG.projectRoot, ['.ts', '.tsx', '.js', '.jsx'], ['node_modules', '.next', 'dist']);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(CONFIG.projectRoot, file);

    // Check for console.log statements (should be removed in production)
    const consoleMatches = content.match(/console\.(log|debug|info)\(/g);
    if (consoleMatches && consoleMatches.length > 3) {
      issues.push({
        id: `code-console-${relativePath.replace(/\//g, '-')}`,
        category: 'data_quality',
        severity: 'low',
        component: relativePath,
        description: `Excessive console statements (${consoleMatches.length}) in ${relativePath}`,
        expectedBehavior: 'Use proper logging or remove debug statements',
        actualBehavior: `Found ${consoleMatches.length} console statements`,
        patch: {
          type: 'note',
          note: 'Review and remove unnecessary console statements',
        },
      });
    }

    // Check for TODO/FIXME comments
    const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX):/gi);
    if (todoMatches && todoMatches.length > 0) {
      issues.push({
        id: `code-todo-${relativePath.replace(/\//g, '-')}`,
        category: 'feature_gap',
        severity: 'low',
        component: relativePath,
        description: `Found ${todoMatches.length} TODO/FIXME comment(s) in ${relativePath}`,
        expectedBehavior: 'Address or document technical debt',
        actualBehavior: todoMatches.slice(0, 3).join(', '),
        patch: {
          type: 'note',
          note: 'Review and address TODO comments',
        },
      });
    }

    // Check for hardcoded URLs (should use environment variables)
    const hardcodedUrls = content.match(/https?:\/\/[^\s'"]+/g);
    if (hardcodedUrls) {
      const nonAllowed = hardcodedUrls.filter(url => 
        !url.includes('localhost') && 
        !url.includes('example.com') &&
        !url.includes('schema.org') &&
        !url.includes('w3.org')
      );
      if (nonAllowed.length > 0) {
        issues.push({
          id: `code-hardcoded-url-${relativePath.replace(/\//g, '-')}`,
          category: 'data_quality',
          severity: 'medium',
          component: relativePath,
          description: `Hardcoded URLs found in ${relativePath}`,
          expectedBehavior: 'Use environment variables for external URLs',
          actualBehavior: `Found: ${nonAllowed.slice(0, 2).join(', ')}`,
          patch: {
            type: 'note',
            note: 'Move URLs to environment variables',
          },
        });
      }
    }

    // Check for missing error handling in async functions
    if (content.includes('async ') && !content.includes('try') && !content.includes('catch')) {
      if (content.includes('await ')) {
        issues.push({
          id: `code-no-error-handling-${relativePath.replace(/\//g, '-')}`,
          category: 'bug',
          severity: 'medium',
          component: relativePath,
          description: `Missing error handling in async code: ${relativePath}`,
          expectedBehavior: 'Async/await should have try/catch',
          actualBehavior: 'No error handling found',
          patch: {
            type: 'note',
            note: 'Add try/catch blocks around await statements',
          },
        });
      }
    }

    // Check for any type usage in TypeScript
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches && anyMatches.length > 5) {
        issues.push({
          id: `code-any-type-${relativePath.replace(/\//g, '-')}`,
          category: 'data_quality',
          severity: 'low',
          component: relativePath,
          description: `Excessive 'any' type usage (${anyMatches.length}) in ${relativePath}`,
          expectedBehavior: 'Use proper TypeScript types',
          actualBehavior: `Found ${anyMatches.length} uses of 'any' type`,
          patch: {
            type: 'note',
            note: 'Replace any with proper types',
          },
        });
      }
    }
  }

  log(`\nCode quality issues found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  return issues;
}

// ============================================================
// PHASE 3: API ENDPOINT ANALYSIS
// ============================================================

function analyzeAPIEndpoints() {
  logSection('🔌 PHASE 3: API ENDPOINT ANALYSIS');
  
  const issues = [];
  const apiDir = path.join(CONFIG.projectRoot, 'src/app/api');

  if (!fs.existsSync(apiDir)) {
    issues.push({
      id: 'api-dir-missing',
      category: 'bug',
      severity: 'critical',
      component: 'api',
      description: 'API directory not found',
      expectedBehavior: 'src/app/api should exist',
      actualBehavior: 'Directory missing',
      patch: {
        type: 'directory',
        path: 'src/app/api',
      },
    });
    return issues;
  }

  // Required API endpoints for HZ Navigator
  const requiredEndpoints = [
    { path: 'health/route.ts', methods: ['GET'], critical: true },
    { path: 'employees/route.ts', methods: ['GET', 'POST'], critical: true },
    { path: 'compliance/route.ts', methods: ['GET', 'POST'], critical: true },
    { path: 'agents/cartograph/route.ts', methods: ['POST'], critical: false },
    { path: 'agents/sentinel/route.ts', methods: ['POST'], critical: false },
  ];

  for (const endpoint of requiredEndpoints) {
    const fullPath = path.join(apiDir, endpoint.path);
    
    if (!fs.existsSync(fullPath)) {
      issues.push({
        id: `api-missing-${endpoint.path.replace(/\//g, '-')}`,
        category: 'feature_gap',
        severity: endpoint.critical ? 'high' : 'medium',
        component: `api/${endpoint.path}`,
        description: `Missing API endpoint: ${endpoint.path}`,
        expectedBehavior: `Endpoint should handle ${endpoint.methods.join(', ')}`,
        actualBehavior: 'Endpoint file not found',
        patch: {
          type: 'file_create',
          path: `src/app/api/${endpoint.path}`,
          template: 'api_route',
          methods: endpoint.methods,
        },
      });
    } else {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for required HTTP methods
      for (const method of endpoint.methods) {
        if (!content.includes(`export async function ${method}`)) {
          issues.push({
            id: `api-method-missing-${endpoint.path.replace(/\//g, '-')}-${method}`,
            category: 'feature_gap',
            severity: 'medium',
            component: `api/${endpoint.path}`,
            description: `Missing ${method} handler in ${endpoint.path}`,
            expectedBehavior: `Should export async function ${method}`,
            actualBehavior: 'Method handler not found',
            patch: {
              type: 'code_addition',
              file: `src/app/api/${endpoint.path}`,
              code: generateMethodHandler(method),
            },
          });
        }
      }

      // Check for error handling
      if (!content.includes('try') || !content.includes('catch')) {
        issues.push({
          id: `api-no-error-handling-${endpoint.path.replace(/\//g, '-')}`,
          category: 'bug',
          severity: 'high',
          component: `api/${endpoint.path}`,
          description: `Missing error handling in ${endpoint.path}`,
          expectedBehavior: 'API routes should have try/catch',
          actualBehavior: 'No error handling found',
          patch: {
            type: 'note',
            note: 'Wrap route handlers in try/catch',
          },
        });
      }

      log(`  ✓ ${endpoint.path}`, 'green');
    }
  }

  log(`\nAPI issues found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  return issues;
}

// ============================================================
// PHASE 4: UI/UX ANALYSIS
// ============================================================

function analyzeUIUX() {
  logSection('🎨 PHASE 4: UI/UX ANALYSIS');
  
  const issues = [];
  const pagesDir = path.join(CONFIG.projectRoot, 'src/app');

  if (!fs.existsSync(pagesDir)) {
    return issues;
  }

  // Find all page files
  const pageFiles = findFiles(pagesDir, ['page.tsx', 'page.jsx'], ['api', 'node_modules']);

  for (const file of pageFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(CONFIG.projectRoot, file);

    // Check for loading states
    if (content.includes('useState') && !content.includes('loading') && !content.includes('Loading')) {
      issues.push({
        id: `ui-no-loading-${relativePath.replace(/\//g, '-')}`,
        category: 'ux_issue',
        severity: 'medium',
        component: relativePath,
        description: `Missing loading state in ${relativePath}`,
        expectedBehavior: 'Pages with state should show loading indicators',
        actualBehavior: 'No loading state found',
        patch: {
          type: 'note',
          note: 'Add loading state and spinner/skeleton',
        },
      });
    }

    // Check for error boundaries or error states
    if (content.includes('fetch') && !content.includes('error') && !content.includes('Error')) {
      issues.push({
        id: `ui-no-error-state-${relativePath.replace(/\//g, '-')}`,
        category: 'ux_issue',
        severity: 'medium',
        component: relativePath,
        description: `Missing error handling UI in ${relativePath}`,
        expectedBehavior: 'Pages should display errors gracefully',
        actualBehavior: 'No error state found',
        patch: {
          type: 'note',
          note: 'Add error state and user-friendly error message',
        },
      });
    }

    // Check for accessibility
    if (content.includes('<button') && !content.includes('aria-')) {
      issues.push({
        id: `ui-a11y-${relativePath.replace(/\//g, '-')}`,
        category: 'ux_issue',
        severity: 'low',
        component: relativePath,
        description: `Missing ARIA attributes in ${relativePath}`,
        expectedBehavior: 'Interactive elements should have ARIA labels',
        actualBehavior: 'No aria-* attributes found on buttons',
        patch: {
          type: 'note',
          note: 'Add aria-label or aria-labelledby to buttons',
        },
      });
    }

    // Check for responsive design
    if (!content.includes('md:') && !content.includes('lg:') && !content.includes('sm:')) {
      issues.push({
        id: `ui-not-responsive-${relativePath.replace(/\//g, '-')}`,
        category: 'ux_issue',
        severity: 'medium',
        component: relativePath,
        description: `No responsive classes in ${relativePath}`,
        expectedBehavior: 'Pages should be responsive',
        actualBehavior: 'No Tailwind responsive prefixes found',
        patch: {
          type: 'note',
          note: 'Add responsive breakpoint classes (sm:, md:, lg:)',
        },
      });
    }

    log(`  ✓ Analyzed: ${relativePath}`, 'cyan');
  }

  log(`\nUI/UX issues found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  return issues;
}

// ============================================================
// PHASE 5: PERFORMANCE ANALYSIS
// ============================================================

function analyzePerformance() {
  logSection('⚡ PHASE 5: PERFORMANCE ANALYSIS');
  
  const issues = [];

  // Check for large files
  const allFiles = findFiles(CONFIG.projectRoot, ['.ts', '.tsx', '.js', '.jsx', '.css'], ['node_modules', '.next', 'dist']);
  
  for (const file of allFiles) {
    const stats = fs.statSync(file);
    const sizeKB = stats.size / 1024;
    const relativePath = path.relative(CONFIG.projectRoot, file);

    if (sizeKB > 100) {
      issues.push({
        id: `perf-large-file-${relativePath.replace(/\//g, '-')}`,
        category: 'performance',
        severity: sizeKB > 500 ? 'high' : 'medium',
        component: relativePath,
        description: `Large file detected: ${relativePath} (${sizeKB.toFixed(1)}KB)`,
        expectedBehavior: 'Files should be < 100KB',
        actualBehavior: `File is ${sizeKB.toFixed(1)}KB`,
        patch: {
          type: 'note',
          note: 'Consider splitting into smaller modules',
        },
      });
    }
  }

  // Check for unoptimized images
  const publicDir = path.join(CONFIG.projectRoot, 'public');
  if (fs.existsSync(publicDir)) {
    const imageFiles = findFiles(publicDir, ['.png', '.jpg', '.jpeg', '.gif'], []);
    
    for (const file of imageFiles) {
      const stats = fs.statSync(file);
      const sizeMB = stats.size / (1024 * 1024);
      const relativePath = path.relative(CONFIG.projectRoot, file);

      if (sizeMB > 1) {
        issues.push({
          id: `perf-large-image-${relativePath.replace(/\//g, '-')}`,
          category: 'performance',
          severity: 'high',
          component: relativePath,
          description: `Large image: ${relativePath} (${sizeMB.toFixed(2)}MB)`,
          expectedBehavior: 'Images should be optimized and < 1MB',
          actualBehavior: `Image is ${sizeMB.toFixed(2)}MB`,
          patch: {
            type: 'note',
            note: 'Compress image or convert to WebP',
          },
        });
      }
    }
  }

  // Check package.json for bundle size concerns
  const pkgPath = path.join(CONFIG.projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const heavyDeps = ['moment', 'lodash', 'jquery', 'bootstrap'];
    
    for (const dep of heavyDeps) {
      if (pkg.dependencies?.[dep]) {
        issues.push({
          id: `perf-heavy-dep-${dep}`,
          category: 'performance',
          severity: 'medium',
          component: 'package.json',
          description: `Heavy dependency detected: ${dep}`,
          expectedBehavior: 'Use lighter alternatives',
          actualBehavior: `${dep} is in dependencies`,
          patch: {
            type: 'note',
            note: `Consider replacing ${dep} with a lighter alternative`,
          },
        });
      }
    }
  }

  log(`\nPerformance issues found: ${issues.length}`, issues.length > 0 ? 'yellow' : 'green');
  return issues;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findFiles(dir, extensions, exclude) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;

  function walk(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        
        if (exclude.some(ex => fullPath.includes(ex))) continue;
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        } catch (e) {
          // Skip files we can't access
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}

function generateFilePatch(filePath) {
  return {
    type: 'file_create',
    path: filePath,
    template: filePath.includes('route.ts') ? 'api_route' : 'component',
  };
}

function getDefaultScript(script) {
  const defaults = {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
  };
  return defaults[script] || '';
}

function getModelDefinition(model) {
  const definitions = {
    Organization: `model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`,
    Employee: `model Employee {
  id             String   @id @default(cuid())
  firstName      String
  lastName       String
  email          String?
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}`,
    AddressVerification: `model AddressVerification {
  id          String   @id @default(cuid())
  address     String
  isHubzone   Boolean
  verifiedAt  DateTime @default(now())
}`,
    ComplianceSnapshot: `model ComplianceSnapshot {
  id                   String   @id @default(cuid())
  organizationId       String
  compliancePercentage Float
  snapshotDate         DateTime @default(now())
}`,
  };
  return definitions[model] || '';
}

function generateMethodHandler(method) {
  return `
export async function ${method}(request: NextRequest) {
  try {
    // TODO: Implement ${method} handler
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('${method} error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`;
}

// ============================================================
// REPORT GENERATION
// ============================================================

function generateReport(allIssues) {
  logSection('📊 FEEDBACK CYCLE REPORT');

  const bySeverity = {
    critical: allIssues.filter(i => i.severity === 'critical'),
    high: allIssues.filter(i => i.severity === 'high'),
    medium: allIssues.filter(i => i.severity === 'medium'),
    low: allIssues.filter(i => i.severity === 'low'),
  };

  const byCategory = {
    bug: allIssues.filter(i => i.category === 'bug'),
    ux_issue: allIssues.filter(i => i.category === 'ux_issue'),
    performance: allIssues.filter(i => i.category === 'performance'),
    feature_gap: allIssues.filter(i => i.category === 'feature_gap'),
    data_quality: allIssues.filter(i => i.category === 'data_quality'),
  };

  console.log('SUMMARY');
  console.log('─'.repeat(40));
  console.log(`Total Issues Found: ${allIssues.length}`);
  console.log('');
  console.log('By Severity:');
  log(`  🔴 Critical: ${bySeverity.critical.length}`, bySeverity.critical.length > 0 ? 'red' : 'green');
  log(`  🟠 High:     ${bySeverity.high.length}`, bySeverity.high.length > 0 ? 'yellow' : 'green');
  log(`  🟡 Medium:   ${bySeverity.medium.length}`, 'yellow');
  log(`  🟢 Low:      ${bySeverity.low.length}`, 'green');
  console.log('');
  console.log('By Category:');
  console.log(`  🐛 Bugs:        ${byCategory.bug.length}`);
  console.log(`  🎨 UX Issues:   ${byCategory.ux_issue.length}`);
  console.log(`  ⚡ Performance: ${byCategory.performance.length}`);
  console.log(`  📦 Features:    ${byCategory.feature_gap.length}`);
  console.log(`  📊 Data:        ${byCategory.data_quality.length}`);

  // Determine if we can proceed
  const canProceed = bySeverity.critical.length === 0;
  
  console.log('\n' + '─'.repeat(40));
  if (canProceed) {
    log('✅ BUILD CAN PROCEED', 'green');
    log(`   Address ${bySeverity.high.length} high-severity issues soon`, 'yellow');
  } else {
    log('🛑 BUILD BLOCKED', 'red');
    log(`   Fix ${bySeverity.critical.length} critical issue(s) before proceeding`, 'red');
  }

  return {
    summary: {
      total: allIssues.length,
      bySeverity: {
        critical: bySeverity.critical.length,
        high: bySeverity.high.length,
        medium: bySeverity.medium.length,
        low: bySeverity.low.length,
      },
      byCategory: {
        bug: byCategory.bug.length,
        ux_issue: byCategory.ux_issue.length,
        performance: byCategory.performance.length,
        feature_gap: byCategory.feature_gap.length,
        data_quality: byCategory.data_quality.length,
      },
    },
    canProceed,
    issues: allIssues,
  };
}

// ============================================================
// PATCH GENERATION
// ============================================================

function generatePatches(issues) {
  logSection('🔧 GENERATING PATCHES');

  const patches = [];
  const autoApply = [];
  const requireReview = [];

  for (const issue of issues) {
    if (!issue.patch) continue;

    const patch = {
      issueId: issue.id,
      severity: issue.severity,
      component: issue.component,
      description: issue.description,
      ...issue.patch,
    };

    patches.push(patch);

    if (CONFIG.autoApplySeverity.includes(issue.severity)) {
      autoApply.push(patch);
    } else {
      requireReview.push(patch);
    }
  }

  console.log(`Total patches: ${patches.length}`);
  log(`  Auto-apply (low/medium): ${autoApply.length}`, 'green');
  log(`  Require review (high/critical): ${requireReview.length}`, 'yellow');

  return { patches, autoApply, requireReview };
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     HZ NAVIGATOR - FEEDBACK CYCLE EXECUTION                ║', 'cyan');
  log('║     Cycle #' + CONFIG.cycleNumber + '                                    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Collect all issues
  const allIssues = [];

  // Run all analysis phases
  allIssues.push(...analyzeFileSystem());
  allIssues.push(...analyzeCodeQuality());
  allIssues.push(...analyzeAPIEndpoints());
  allIssues.push(...analyzeUIUX());
  allIssues.push(...analyzePerformance());

  // Generate report
  const report = generateReport(allIssues);

  // Generate patches
  const { patches, autoApply, requireReview } = generatePatches(allIssues);

  // Save results
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const outputFile = path.join(CONFIG.outputDir, `cycle-${CONFIG.cycleNumber}.json`);
  fs.writeFileSync(outputFile, JSON.stringify({
    cycleNumber: CONFIG.cycleNumber,
    timestamp: new Date().toISOString(),
    report,
    patches,
    autoApply,
    requireReview,
  }, null, 2));

  log(`\n📁 Results saved to: ${outputFile}`, 'cyan');

  // Print action items
  if (requireReview.length > 0) {
    logSection('⚠️  ACTION REQUIRED - REVIEW THESE PATCHES');
    for (const patch of requireReview.slice(0, 10)) {
      log(`\n[${patch.severity.toUpperCase()}] ${patch.description}`, patch.severity === 'critical' ? 'red' : 'yellow');
      console.log(`   Component: ${patch.component}`);
      if (patch.type === 'note') {
        console.log(`   Action: ${patch.note}`);
      }
    }
    if (requireReview.length > 10) {
      console.log(`\n   ... and ${requireReview.length - 10} more. See ${outputFile} for full list.`);
    }
  }

  console.log('\n');
  return report;
}

// Run
main().catch(console.error);
