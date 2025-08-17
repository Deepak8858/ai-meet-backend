const express = require('express')
const router = express.Router()
const SecurityMiddleware = require('../middleware/security')

// In-memory storage for templates (in production, use database)
let templates = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Standard meeting notes template',
    content: `# Meeting Notes - [Date]

## Meeting Details
- **Date**: [Date]
- **Time**: [Time]
- **Attendees**: [List attendees]

## Agenda Items
1. [Item 1]
2. [Item 2]
3. [Item 3]

## Discussion Points
- [Key discussion points]

## Action Items
- [ ] [Action item 1] - [Assignee] - [Due date]
- [ ] [Action item 2] - [Assignee] - [Due date]

## Next Steps
- [Next steps or follow-up items]`,
    category: 'business',
    tags: ['meeting', 'notes', 'business'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'project-summary',
    name: 'Project Summary',
    description: 'Comprehensive project summary template',
    content: `# Project Summary - [Project Name]

## Overview
[Brief project description]

## Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

## Key Achievements
- [Achievement 1]
- [Achievement 2]
- [Achievement 3]

## Challenges Faced
- [Challenge 1] - [Resolution]
- [Challenge 2] - [Resolution]

## Metrics & Results
- [Metric 1]: [Value]
- [Metric 2]: [Value]
- [Metric 3]: [Value]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]

## Next Steps
- [Next action 1]
- [Next action 2]`,
    category: 'project',
    tags: ['project', 'summary', 'report'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'research-summary',
    name: 'Research Summary',
    description: 'Academic research summary template',
    content: `# Research Summary - [Research Topic]

## Abstract
[Brief overview of research findings]

## Introduction
[Background and research question]

## Methodology
[Research methods used]

## Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

## Implications
[What do these findings mean?]

## Conclusions
[Main conclusions from the research]

## Future Research
[Suggestions for future research directions]`,
    category: 'academic',
    tags: ['research', 'academic', 'summary'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'weekly-report',
    name: 'Weekly Report',
    description: 'Weekly progress report template',
    content: `# Weekly Report - Week [Week Number]

## Completed This Week
- [Task 1] - [Status]
- [Task 2] - [Status]
- [Task 3] - [Status]

## In Progress
- [Task A] - [Progress %]
- [Task B] - [Progress %]

## Blockers & Issues
- [Issue 1] - [Resolution plan]
- [Issue 2] - [Resolution plan]

## Next Week's Priorities
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Metrics
- [Metric 1]: [Value]
- [Metric 2]: [Value]`,
    category: 'report',
    tags: ['weekly', 'report', 'progress'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'client-meeting',
    name: 'Client Meeting Notes',
    description: 'Client meeting documentation template',
    content: `# Client Meeting Notes - [Client Name]

## Meeting Details
- **Date**: [Date]
- **Client**: [Client Name]
- **Attendees**: [List attendees]
- **Duration**: [Duration]

## Client Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Discussion Summary
[Key points discussed with client]

## Client Feedback
- [Feedback point 1]
- [Feedback point 2]

## Action Items
- [ ] [Action 1] - [Owner] - [Due date]
- [ ] [Action 2] - [Owner] - [Due date]

## Follow-up Required
- [Follow-up item 1]
- [Follow-up item 2]`,
    category: 'client',
    tags: ['client', 'meeting', 'requirements'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

// GET all templates
router.get('/templates', (req, res) => {
  try {
    const { category, search } = req.query
    
    let filteredTemplates = templates
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    res.json({
      success: true,
      templates: filteredTemplates,
      count: filteredTemplates.length
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    })
  }
})

// GET template by ID
router.get('/templates/:id', (req, res) => {
  try {
    const template = templates.find(t => t.id === req.params.id)
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      })
    }
    
    res.json({
      success: true,
      template
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template'
    })
  }
})

// POST create new template
router.post('/templates', (req, res) => {
  try {
    const { name, description, content, category, tags } = req.body
    
    // Validate input
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Name and content are required'
      })
    }
    
    // Sanitize inputs
    const sanitizedName = SecurityMiddleware.sanitizeInput(name)
    const sanitizedDescription = SecurityMiddleware.sanitizeInput(description || '')
    const sanitizedContent = SecurityMiddleware.sanitizeInput(content)
    const sanitizedCategory = SecurityMiddleware.sanitizeInput(category || 'general')
    
    const newTemplate = {
      id: Date.now().toString(),
      name: sanitizedName,
      description: sanitizedDescription,
      content: sanitizedContent,
      category: sanitizedCategory,
      tags: Array.isArray(tags) ? tags.map(tag => SecurityMiddleware.sanitizeInput(tag)) : [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    templates.push(newTemplate)
    
    res.status(201).json({
      success: true,
      template: newTemplate
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    })
  }
})

// GET template categories
router.get('/templates/categories', (req, res) => {
  try {
    const categories = [...new Set(templates.map(t => t.category))]
    res.json({
      success: true,
      categories
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    })
  }
})

// POST duplicate template
router.post('/templates/:id/duplicate', (req, res) => {
  try {
    const originalTemplate = templates.find(t => t.id === req.params.id)
    
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      })
    }
    
    const duplicatedTemplate = {
      ...originalTemplate,
      id: Date.now().toString(),
      name: `${originalTemplate.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    templates.push(duplicatedTemplate)
    
    res.status(201).json({
      success: true,
      template: duplicatedTemplate
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate template'
    })
  }
})

module.exports = router