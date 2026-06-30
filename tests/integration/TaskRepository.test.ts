import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { TaskRepository } from '../../src/main/db/repositories/TaskRepository'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  const propertyId = 'prop_a'
  db.prepare('INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(propertyId, 'House', '[]', 1, Date.now(), Date.now())
  db.prepare('INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?,?,?,?,?)')
    .run('panel-1', propertyId, 'Main', 20, 200)
  db.prepare("INSERT INTO breakers (id, panel_id, position, breaker_type, amperage, status) VALUES ('breaker-x','panel-1',5,'single-pole',15,'active')").run()
  db.prepare("INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room) VALUES ('e1','panel-1','[]','outlet','Outlet A','Kitchen')").run()
  db.prepare("INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room) VALUES ('e2','panel-1','[]','outlet','Outlet B','Garage')").run()
  return db
}

describe('TaskRepository', () => {
  let db: Database.Database
  let repo: TaskRepository

  beforeEach(() => {
    db = makeDb()
    repo = new TaskRepository(db)
  })

  function entityTask(entityId: string, title: string, extra: Record<string, unknown> = {}) {
    return repo.create({ target_type: 'entity', target_id: entityId, title, ...extra })
  }

  it('creates a task (open, no completed_at)', () => {
    const t = repo.create({ target_type: 'entity', target_id: 'e1', title: 'Self-ground this outlet', task_type: 'Self-Ground', notes: 'needs 20A box' })
    expect(t.status).toBe('open')
    expect(t.completed_at).toBeNull()
    expect(t.task_type).toBe('Self-Ground')
    expect(t.target_type).toBe('entity')
    expect(t.target_id).toBe('e1')
  })

  it('complete sets done + completed_at; reopen clears it', () => {
    const t = entityTask('e1', 'X')
    const done = repo.complete(t.id)!
    expect(done.status).toBe('done')
    expect(done.completed_at).not.toBeNull()
    const open = repo.reopen(t.id)!
    expect(open.status).toBe('open')
    expect(open.completed_at).toBeNull()
  })

  it('listForProperty resolves labels across target types', () => {
    entityTask('e1', 'A task')
    repo.create({ target_type: 'breaker', target_id: 'breaker-x', title: 'Replace breaker' })
    repo.create({ target_type: 'panel', target_id: 'panel-1', title: 'Label the panel' })
    repo.create({ target_type: 'property', target_id: 'prop_a', title: 'Schedule inspection' })

    const list = repo.listForProperty('prop_a')
    expect(list).toHaveLength(4)
    const byTitle = (t: string) => list.find(x => x.title === t)!
    expect(byTitle('A task').target_label).toBe('Outlet A')
    expect(byTitle('A task').target_room).toBe('Kitchen')
    expect(byTitle('Label the panel').target_label).toBe('Main')
    expect(byTitle('Schedule inspection').target_label).toBe('House')
    // breaker label falls back to "Breaker <pos>" — see breaker fixture below
    expect(byTitle('Replace breaker').target_label).toMatch(/Breaker|Kitchen breaker/)
  })

  it('openCountForTarget counts only open tasks for that target', () => {
    const t1 = entityTask('e1', '1')
    entityTask('e1', '2')
    expect(repo.openCountForTarget('entity', 'e1')).toBe(2)
    repo.complete(t1.id)
    expect(repo.openCountForTarget('entity', 'e1')).toBe(1)
  })

  it('tasks are pruned when their entity is deleted (trigger)', () => {
    const t = entityTask('e1', 'doomed')
    db.prepare('DELETE FROM entities WHERE id = ?').run('e1')
    expect(repo.findById(t.id)).toBeNull()
  })

  it('property tasks survive deleting a panel (different target)', () => {
    const t = repo.create({ target_type: 'property', target_id: 'prop_a', title: 'property todo' })
    db.prepare('DELETE FROM panels WHERE id = ?').run('panel-1')
    expect(repo.findById(t.id)).not.toBeNull()
  })

  it('listForProperty derives entity amperage from the breaker, and breaker amperage directly', () => {
    // Map e1 onto breaker-x (15A).
    db.prepare("UPDATE entities SET breaker_ids='[\"breaker-x\"]' WHERE id='e1'").run()
    entityTask('e1', 'self-ground e1')
    entityTask('e2', 'unmapped e2') // e2 has no breaker
    repo.create({ target_type: 'breaker', target_id: 'breaker-x', title: 'breaker task' })

    const list = repo.listForProperty('prop_a')
    const byTitle = (t: string) => list.find(x => x.title === t)!
    expect(byTitle('self-ground e1').target_amperage).toBe(15)
    expect(byTitle('unmapped e2').target_amperage).toBeNull()
    expect(byTitle('breaker task').target_amperage).toBe(15)
  })

  // ---- Tag-wired rules + templates ----

  function tag(name: string): string {
    const id = `tag-${name}`
    db.prepare("INSERT INTO tags (id, property_id, name, condense, created_at, updated_at) VALUES (?, 'prop_a', ?, 0, ?, ?)")
      .run(id, name, new Date().toISOString(), new Date().toISOString())
    return id
  }
  function tagsOn(entityId: string): string[] {
    return (db.prepare(
      "SELECT t.name FROM tag_links l JOIN tags t ON t.id=l.tag_id WHERE l.target_type='entity' AND l.target_id=?"
    ).all(entityId) as any[]).map(r => r.name)
  }

  function tagsOnTarget(targetType: string, targetId: string): string[] {
    return (db.prepare(
      "SELECT t.name FROM tag_links l JOIN tags t ON t.id=l.tag_id WHERE l.target_type=? AND l.target_id=?"
    ).all(targetType, targetId) as any[]).map(r => r.name)
  }

  it('on_create_tag_id attaches the tag to the entity', () => {
    const needs = tag('Needs Ground')
    repo.create({ target_type: 'entity', target_id: 'e1', title: 'ground it', on_create_tag_id: needs })
    expect(tagsOn('e1')).toContain('Needs Ground')
  })

  it('on_create_tag_id attaches to a non-entity target (breaker)', () => {
    const flagged = tag('Inspect Me')
    repo.create({ target_type: 'breaker', target_id: 'breaker-x', title: 'check breaker', on_create_tag_id: flagged })
    expect(tagsOnTarget('breaker', 'breaker-x')).toContain('Inspect Me')
  })

  it('completeWithRules removes + adds tags and logs history on the task target', () => {
    const needs = tag('Needs Ground')
    const grounded = tag('Self-Grounded')
    const t = repo.create({
      target_type: 'entity', target_id: 'e1', title: 'self-ground',
      on_create_tag_id: needs,
      on_complete_remove_tag_ids: [needs],
      on_complete_add_tag_ids: [grounded],
      on_complete_log_history: true
    })
    expect(tagsOn('e1')).toContain('Needs Ground')

    repo.completeWithRules(t.id, 'prop_a')

    const after = tagsOn('e1')
    expect(after).not.toContain('Needs Ground')
    expect(after).toContain('Self-Grounded')
    expect(repo.findById(t.id)!.status).toBe('done')
    const hist = db.prepare(
      "SELECT COUNT(*) c FROM event_links WHERE target_type='entity' AND target_id='e1'"
    ).get() as { c: number }
    expect(hist.c).toBe(1)
  })

  it('completeWithRules applies tags to a breaker target', () => {
    const done = tag('Replaced')
    const t = repo.create({
      target_type: 'breaker', target_id: 'breaker-x', title: 'replace breaker',
      on_complete_add_tag_ids: [done], on_complete_log_history: true
    })
    repo.completeWithRules(t.id, 'prop_a')
    expect(tagsOnTarget('breaker', 'breaker-x')).toContain('Replaced')
    const hist = db.prepare(
      "SELECT COUNT(*) c FROM event_links WHERE target_type='breaker' AND target_id='breaker-x'"
    ).get() as { c: number }
    expect(hist.c).toBe(1)
  })

  it('completeWithRules is a no-op (no crash) when a remove-tag is not present', () => {
    const missing = tag('Not Attached')
    const added = tag('Done')
    const t = repo.create({
      target_type: 'entity', target_id: 'e1', title: 'flip tags',
      on_complete_remove_tag_ids: [missing], // never attached to e1
      on_complete_add_tag_ids: [added]
    })
    // Should not throw; removes nothing, still adds the add-tag, marks done.
    expect(() => repo.completeWithRules(t.id, 'prop_a')).not.toThrow()
    expect(tagsOn('e1')).toContain('Done')
    expect(repo.findById(t.id)!.status).toBe('done')
  })

  it('completeWithRules adding an already-present tag does not duplicate or crash', () => {
    const dup = tag('Already Here')
    // Attach it up-front, then complete a task that also adds it.
    db.prepare("INSERT INTO tag_links (id, tag_id, target_type, target_id, created_at) VALUES ('pre', ?, 'entity', 'e1', ?)")
      .run(dup, new Date().toISOString())
    const t = repo.create({ target_type: 'entity', target_id: 'e1', title: 'add dup', on_complete_add_tag_ids: [dup] })
    expect(() => repo.completeWithRules(t.id, 'prop_a')).not.toThrow()
    const count = db.prepare("SELECT COUNT(*) c FROM tag_links WHERE tag_id=? AND target_id='e1'").get(dup) as { c: number }
    expect(count.c).toBe(1) // still exactly one link
  })

  it('createFromTemplate makes one task per target, substituting {entityName}', () => {
    const needs = tag('Needs Ground')
    const tpl = repo.createTemplate({
      property_id: 'prop_a', name: 'Self-ground', task_type: 'Self-Ground',
      title_template: 'Self-ground {entityName}',
      on_create_tag_id: needs, on_complete_add_tag_ids: [], on_complete_remove_tag_ids: [needs], on_complete_log_history: true
    })
    const ids = repo.createFromTemplate(tpl.id, [
      { target_type: 'entity', target_id: 'e1' },
      { target_type: 'entity', target_id: 'e2' }
    ])
    expect(ids).toHaveLength(2)
    const t1 = repo.findById(ids[0])!
    expect(t1.title).toMatch(/Self-ground (Outlet A|Outlet B)/)
    expect(tagsOn('e1')).toContain('Needs Ground')
    expect(tagsOn('e2')).toContain('Needs Ground')
  })

  it('createFromTemplate fans out across mixed target types', () => {
    const tpl = repo.createTemplate({
      property_id: 'prop_a', name: 'Inspect', task_type: 'Inspect',
      title_template: 'Inspect {entityName}'
    })
    const ids = repo.createFromTemplate(tpl.id, [
      { target_type: 'entity', target_id: 'e1' },
      { target_type: 'breaker', target_id: 'breaker-x' }
    ])
    expect(ids).toHaveLength(2)
    const titles = ids.map(id => repo.findById(id)!.title)
    expect(titles).toContain('Inspect Outlet A')
    expect(titles.some(t => /Inspect Breaker 5/.test(t))).toBe(true)
  })
})
