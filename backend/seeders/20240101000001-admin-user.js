const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const adminId  = uuidv4();
const memberId = uuidv4();
const projectId = uuidv4();
const sprintId  = uuidv4();
const now = new Date();

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('users', [
      { id: adminId,  name: 'Admin',       email: 'admin@local.dev',  password: await bcrypt.hash('admin123', 12), role: 'admin',  is_active: 1, created_at: now, updated_at: now },
      { id: memberId, name: 'Cece Abdurahman', email: 'cece@local.dev', password: await bcrypt.hash('member123', 12), role: 'member', is_active: 1, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('projects', [{
      id: projectId, name: 'Project Pertama', description: 'Proyek demo untuk memulai',
      status: 'active', color: '#2E6DA4', owner_id: adminId,
      start_date: now.toISOString().split('T')[0],
      end_date: new Date(now.getTime() + 30*86400000).toISOString().split('T')[0],
      created_at: now, updated_at: now,
    }]);

    await queryInterface.bulkInsert('project_members', [
      { id: uuidv4(), project_id: projectId, user_id: adminId,  role: 'owner',  created_at: now, updated_at: now },
      { id: uuidv4(), project_id: projectId, user_id: memberId, role: 'member', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('sprints', [{
      id: sprintId, project_id: projectId, name: 'Sprint 1', goal: 'Setup awal & fitur dasar',
      status: 'active',
      start_date: now.toISOString().split('T')[0],
      end_date: new Date(now.getTime() + 14*86400000).toISOString().split('T')[0],
      created_at: now, updated_at: now,
    }]);

    const tasks = [
      ['Setup environment development', 'todo',        'high',   adminId,  0],
      ['Buat desain database',          'done',        'high',   adminId,  1],
      ['Implementasi login page',       'in_progress', 'medium', memberId, 2],
      ['Buat Kanban board',             'backlog',     'medium', memberId, 3],
      ['Testing dan QA',                'backlog',     'low',    null,     4],
    ];

    await queryInterface.bulkInsert('tasks', tasks.map(([title, status, priority, assigneeId, pos]) => ({
      id: uuidv4(), project_id: projectId, sprint_id: sprintId,
      title, status, priority, story_points: 3,
      assignee_id: assigneeId, reporter_id: adminId,
      due_date: new Date(now.getTime() + (7+pos*2)*86400000).toISOString().split('T')[0],
      position: pos, labels: '[]',
      created_at: now, updated_at: now,
    })));
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('tasks', null);
    await queryInterface.bulkDelete('sprints', null);
    await queryInterface.bulkDelete('project_members', null);
    await queryInterface.bulkDelete('projects', null);
    await queryInterface.bulkDelete('users', null);
  },
};
