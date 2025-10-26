import { contextBridge, ipcRenderer } from 'electron'
import type {
  Panel,
  Breaker,
  BreakerWithEntityCount,
  Entity,
  EntitiesByRoom,
  CreatePanelInput,
  CreateBreakerInput,
  CreateEntityInput,
  UpdatePanelInput,
  UpdateBreakerInput,
  UpdateEntityInput
} from '../shared/types'

export interface ElectronAPI {
  panels: {
    create: (input: CreatePanelInput) => Promise<Panel>
    getCurrentOrNull: () => Promise<Panel | null>
    findAll: () => Promise<Panel[]>
    findById: (id: string) => Promise<Panel | null>
    update: (id: string, input: UpdatePanelInput) => Promise<Panel | null>
    delete: (id: string) => Promise<boolean>
  }
  breakers: {
    create: (input: CreateBreakerInput) => Promise<Breaker>
    createBatch: (inputs: CreateBreakerInput[]) => Promise<Breaker[]>
    findById: (id: string) => Promise<Breaker | null>
    listByPanel: (panelId: string) => Promise<BreakerWithEntityCount[]>
    update: (id: string, input: UpdateBreakerInput) => Promise<Breaker | null>
    delete: (id: string) => Promise<boolean>
  }
  entities: {
    create: (input: CreateEntityInput) => Promise<Entity>
    createBatch: (inputs: CreateEntityInput[]) => Promise<Entity[]>
    findById: (id: string) => Promise<Entity | null>
    listByPanel: (panelId: string) => Promise<Entity[]>
    listByBreaker: (breakerId: string) => Promise<Entity[]>
    listUnmapped: (panelId: string) => Promise<Entity[]>
    groupByRoom: (panelId: string) => Promise<EntitiesByRoom[]>
    search: (panelId: string, query: string) => Promise<Entity[]>
    assignToBreaker: (entityIds: string[], breakerId: string) => Promise<void>
    unassignFromBreaker: (entityIds: string[]) => Promise<void>
    update: (id: string, input: UpdateEntityInput) => Promise<Entity | null>
    delete: (id: string) => Promise<boolean>
  }
}

const electronAPI: ElectronAPI = {
  panels: {
    create: (input) => ipcRenderer.invoke('panels:create', input),
    getCurrentOrNull: () => ipcRenderer.invoke('panels:getCurrentOrNull'),
    findAll: () => ipcRenderer.invoke('panels:findAll'),
    findById: (id) => ipcRenderer.invoke('panels:findById', id),
    update: (id, input) => ipcRenderer.invoke('panels:update', id, input),
    delete: (id) => ipcRenderer.invoke('panels:delete', id)
  },
  breakers: {
    create: (input) => ipcRenderer.invoke('breakers:create', input),
    createBatch: (inputs) => ipcRenderer.invoke('breakers:createBatch', inputs),
    findById: (id) => ipcRenderer.invoke('breakers:findById', id),
    listByPanel: (panelId) => ipcRenderer.invoke('breakers:listByPanel', panelId),
    update: (id, input) => ipcRenderer.invoke('breakers:update', id, input),
    delete: (id) => ipcRenderer.invoke('breakers:delete', id)
  },
  entities: {
    create: (input) => ipcRenderer.invoke('entities:create', input),
    createBatch: (inputs) => ipcRenderer.invoke('entities:createBatch', inputs),
    findById: (id) => ipcRenderer.invoke('entities:findById', id),
    listByPanel: (panelId) => ipcRenderer.invoke('entities:listByPanel', panelId),
    listByBreaker: (breakerId) => ipcRenderer.invoke('entities:listByBreaker', breakerId),
    listUnmapped: (panelId) => ipcRenderer.invoke('entities:listUnmapped', panelId),
    groupByRoom: (panelId) => ipcRenderer.invoke('entities:groupByRoom', panelId),
    search: (panelId, query) => ipcRenderer.invoke('entities:search', panelId, query),
    assignToBreaker: (entityIds, breakerId) =>
      ipcRenderer.invoke('entities:assignToBreaker', entityIds, breakerId),
    unassignFromBreaker: (entityIds) =>
      ipcRenderer.invoke('entities:unassignFromBreaker', entityIds),
    update: (id, input) => ipcRenderer.invoke('entities:update', id, input),
    delete: (id) => ipcRenderer.invoke('entities:delete', id)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
