'use client';

import React, { useState, useEffect } from 'react';
import { scheduleTemplateService, ScheduleTemplate, ScheduleTemplateWithItems } from '@/app/services/scheduleTemplate';
import CreateTemplateModal from './CreateTemplateModal';
import EditTemplateModal from './EditTemplateModal';
import GenerateScheduleModal from './GenerateScheduleModal';
import './style.css';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleTemplateManager() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplateWithItems | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await scheduleTemplateService.getAllTemplates();
      setTemplates(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      await scheduleTemplateService.createTemplate(templateData);
      await fetchTemplates();
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    }
  };

  const handleEditTemplate = async (templateId: number, templateData: any) => {
    try {
      await scheduleTemplateService.updateTemplate(templateId, templateData);
      await fetchTemplates();
      setShowEditModal(false);
      setSelectedTemplate(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await scheduleTemplateService.deleteTemplate(templateId);
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  const handleGenerateSchedule = async (templateId: number, startDate: string) => {
    try {
      const result = await scheduleTemplateService.generateScheduleFromTemplate({
        templateId,
        startDate,
      });
      setSuccess(`Successfully created ${result.classesCreated} classes!`);
      setShowGenerateModal(false);
      setSelectedTemplate(null);
      
      // Trigger calendar refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('scheduleGenerated', { 
        detail: { classesCreated: result.classesCreated } 
      }));
      
      // Also set localStorage trigger for cross-page communication
      localStorage.setItem('refreshCalendar', 'true');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule');
    }
  };

  const openEditModal = async (template: ScheduleTemplate) => {
    try {
      const fullTemplate = await scheduleTemplateService.getTemplateById(template.templateId);
      setSelectedTemplate(fullTemplate);
      setShowEditModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load template details');
    }
  };

  const openGenerateModal = async (template: ScheduleTemplate) => {
    try {
      const fullTemplate = await scheduleTemplateService.getTemplateById(template.templateId);
      setSelectedTemplate(fullTemplate);
      setShowGenerateModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load template details');
    }
  };

  if (loading) {
    return <div className="loading">Loading templates...</div>;
  }

  return (
    <div className="schedule-template-manager">
      <div className="header">
        <h2>Schedule Templates</h2>
        <button 
          className="create-button"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Template
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="templates-grid">
        {templates.map((template) => (
          <div key={template.templateId} className="template-card">
            <div className="template-header">
              <h3>{template.name}</h3>
              <div className={`status ${template.isActive ? 'active' : 'inactive'}`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            {template.description && (
              <p className="template-description">{template.description}</p>
            )}

            <div className="template-actions">
              <button 
                className="action-button edit"
                onClick={() => openEditModal(template)}
              >
                Edit
              </button>
              <button 
                className="action-button generate"
                onClick={() => openGenerateModal(template)}
              >
                Generate Schedule
              </button>
              <button 
                className="action-button delete"
                onClick={() => handleDeleteTemplate(template.templateId)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="empty-state">
          <p>No templates found. Create your first template to get started.</p>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
        />
      )}

      {showEditModal && selectedTemplate && (
        <EditTemplateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onSubmit={handleEditTemplate}
        />
      )}

      {showGenerateModal && selectedTemplate && (
        <GenerateScheduleModal
          isOpen={showGenerateModal}
          onClose={() => {
            setShowGenerateModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onSubmit={handleGenerateSchedule}
        />
      )}
    </div>
  );
}
