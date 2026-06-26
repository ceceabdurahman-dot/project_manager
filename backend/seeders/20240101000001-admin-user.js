const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { QueryTypes } = require('sequelize');

const now = () => new Date();
const dateOnly = (date) => date.toISOString().split('T')[0];

const seedUsers = [
  { name: 'Admin', email: 'admin@local.dev', password: 'admin123', role: 'admin' },
  { name: 'Cece Abdurahman', email: 'cece@local.dev', password: 'member123', role: 'member' },
];

const seedTaskSpecs = [
  ['Setup environment development', 'todo', 'high', 'admin@local.dev', 0],
  ['Buat desain database', 'done', 'high', 'admin@local.dev', 1],
  ['Implementasi login page', 'in_progress', 'medium', 'cece@local.dev', 2],
  ['Buat Kanban board', 'backlog', 'medium', 'cece@local.dev', 3],
  ['Testing dan QA', 'backlog', 'low', null, 4],
];

const findOne = async (queryInterface, sql, replacements) => {
  const rows = await queryInterface.sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
  return rows[0] || null;
};

const ensureUser = async (queryInterface, spec) => {
  const existing = await findOne(queryInterface, 'SELECT id FROM users WHERE email = :email', { email: spec.email });
  if (existing) return existing.id;

  const insertedAt = now();
  const id = randomUUID();
  await queryInterface.bulkInsert('users', [{
    id,
    name: spec.name,
    email: spec.email,
    password: await bcrypt.hash(spec.password, 12),
    role: spec.role,
    is_active: 1,
    created_at: insertedAt,
    updated_at: insertedAt,
  }]);
  return id;
};

const ensureProject = async (queryInterface, ownerId) => {
  const existing = await findOne(queryInterface, 'SELECT id FROM projects WHERE name = :name', { name: 'Project Pertama' });
  if (existing) return existing.id;

  const insertedAt = now();
  const id = randomUUID();
  await queryInterface.bulkInsert('projects', [{
    id,
    name: 'Project Pertama',
    description: 'Proyek demo untuk memulai',
    status: 'active',
    color: '#2E6DA4',
    owner_id: ownerId,
    start_date: dateOnly(insertedAt),
    end_date: dateOnly(new Date(insertedAt.getTime() + 30 * 86400000)),
    created_at: insertedAt,
    updated_at: insertedAt,
  }]);
  return id;
};

const ensureProjectMember = async (queryInterface, projectId, userId, role) => {
  const existing = await findOne(
    queryInterface,
    'SELECT id FROM project_members WHERE project_id = :projectId AND user_id = :userId',
    { projectId, userId },
  );
  if (existing) return existing.id;

  const insertedAt = now();
  const id = randomUUID();
  await queryInterface.bulkInsert('project_members', [{
    id,
    project_id: projectId,
    user_id: userId,
    role,
    created_at: insertedAt,
    updated_at: insertedAt,
  }]);
  return id;
};

const ensureSprint = async (queryInterface, projectId) => {
  const existing = await findOne(
    queryInterface,
    'SELECT id FROM sprints WHERE project_id = :projectId AND name = :name',
    { projectId, name: 'Sprint 1' },
  );
  if (existing) return existing.id;

  const insertedAt = now();
  const id = randomUUID();
  await queryInterface.bulkInsert('sprints', [{
    id,
    project_id: projectId,
    name: 'Sprint 1',
    goal: 'Setup awal & fitur dasar',
    status: 'active',
    start_date: dateOnly(insertedAt),
    end_date: dateOnly(new Date(insertedAt.getTime() + 14 * 86400000)),
    created_at: insertedAt,
    updated_at: insertedAt,
  }]);
  return id;
};

const ensureTask = async (queryInterface, projectId, sprintId, reporterId, userIdsByEmail, spec) => {
  const [title, status, priority, assigneeEmail, position] = spec;
  const existing = await findOne(
    queryInterface,
    'SELECT id FROM tasks WHERE project_id = :projectId AND title = :title',
    { projectId, title },
  );
  if (existing) return existing.id;

  const insertedAt = now();
  const assigneeId = assigneeEmail ? userIdsByEmail[assigneeEmail] : null;
  const id = randomUUID();
  await queryInterface.bulkInsert('tasks', [{
    id,
    project_id: projectId,
    sprint_id: sprintId,
    title,
    status,
    priority,
    story_points: 3,
    assignee_id: assigneeId,
    reporter_id: reporterId,
    due_date: dateOnly(new Date(insertedAt.getTime() + (7 + position * 2) * 86400000)),
    position,
    labels: '[]',
    created_at: insertedAt,
    updated_at: insertedAt,
  }]);
  return id;
};

module.exports = {
  up: async (queryInterface) => {
    const userIdsByEmail = {};
    for (const user of seedUsers) {
      userIdsByEmail[user.email] = await ensureUser(queryInterface, user);
    }

    const projectId = await ensureProject(queryInterface, userIdsByEmail['admin@local.dev']);
    await ensureProjectMember(queryInterface, projectId, userIdsByEmail['admin@local.dev'], 'owner');
    await ensureProjectMember(queryInterface, projectId, userIdsByEmail['cece@local.dev'], 'member');

    const sprintId = await ensureSprint(queryInterface, projectId);
    for (const taskSpec of seedTaskSpecs) {
      await ensureTask(queryInterface, projectId, sprintId, userIdsByEmail['admin@local.dev'], userIdsByEmail, taskSpec);
    }
  },

  down: async (queryInterface) => {
    const project = await findOne(queryInterface, 'SELECT id FROM projects WHERE name = :name', { name: 'Project Pertama' });
    if (project) {
      await queryInterface.bulkDelete('tasks', { project_id: project.id });
      await queryInterface.bulkDelete('sprints', { project_id: project.id });
      await queryInterface.bulkDelete('project_members', { project_id: project.id });
      await queryInterface.bulkDelete('projects', { id: project.id });
    }

    await queryInterface.bulkDelete('users', { email: seedUsers.map((user) => user.email) });
  },
};
