import { contextBridge, ipcRenderer } from 'electron'
import type {
  Property,
  Panel,
  Breaker,
  BreakerWithEntityCount,
  Entity,
  EntitiesByRoom,
  CreatePropertyInput,
  CreatePanelInput,
  CreateBreakerInput,
  CreateEntityInput,
  UpdatePropertyInput,
  UpdatePanelInput,
  UpdateBreakerInput,
  UpdateEntityInput
} from '../shared/types'

export interface ElectronAPI {
  properties: {
    create: (input: CreatePropertyInput) => Promise<Property>
    getCurrentOrNull: () => Promise<Property | null>
    findAll: () => Promise<Property[]>
    findById: (id: string) => Promise<Property | null>
    setAsCurrent: (id: string) => Promise<Property | null>
    update: (id: string, input: UpdatePropertyInput) => Promise<Property | null>
    delete: (id: string) => Promise<boolean>
    addCustomEntityType: (propertyId: string, newType: string) => Promise<Property | null>
    removeCustomEntityType: (propertyId: string, typeToRemove: string) => Promise<Property | null>
  }
  panels: {
    create: (input: CreatePanelInput) => Promise<Panel>
    getCurrentOrNull: () => Promise<Panel | null>
    findAll: () => Promise<Panel[]>
    findById: (id: string) => Promise<Panel | null>
    findByProperty: (propertyId: string) => Promise<Panel[]>
    update: (id: string, input: UpdatePanelInput) => Promise<Panel | null>
    delete: (id: string) => Promise<boolean>
    reset: (id: string) => Promise<{ entitiesDeleted: number; breakersDeleted: number }>
  }
  backup: {
    export: () => Promise<{ success: boolean; message: string }>
    import: () => Promise<{ success: boolean; message: string }>
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
    getAllRooms: (panelId: string) => Promise<Array<{ room: string; count: number }>>
    deleteRoom: (panelId: string, roomName: string) => Promise<number>
    renameRoom: (panelId: string, oldName: string, newName: string) => Promise<number>
    getAllEntityTypes: (panelId: string) => Promise<Array<{ entity_type: string; count: number }>>
    changeEntityType: (panelId: string, oldType: string, newType: string) => Promise<number>
  }
}

const electronAPI: ElectronAPI = {
  properties: {
    create: (input) => ipcRenderer.invoke('properties:create', input),
    getCurrentOrNull: () => ipcRenderer.invoke('properties:getCurrentOrNull'),
    findAll: () => ipcRenderer.invoke('properties:findAll'),
    findById: (id) => ipcRenderer.invoke('properties:findById', id),
    setAsCurrent: (id) => ipcRenderer.invoke('properties:setAsCurrent', id),
    update: (id, input) => ipcRenderer.invoke('properties:update', id, input),
    delete: (id) => ipcRenderer.invoke('properties:delete', id),
    addCustomEntityType: (propertyId, newType) => ipcRenderer.invoke('properties:addCustomEntityType', propertyId, newType),
    removeCustomEntityType: (propertyId, typeToRemove) => ipcRenderer.invoke('properties:removeCustomEntityType', propertyId, typeToRemove)
  },
  panels: {
    create: (input) => ipcRenderer.invoke('panels:create', input),
    getCurrentOrNull: () => ipcRenderer.invoke('panels:getCurrentOrNull'),
    findAll: () => ipcRenderer.invoke('panels:findAll'),
    findById: (id) => ipcRenderer.invoke('panels:findById', id),
    findByProperty: (propertyId) => ipcRenderer.invoke('panels:findByProperty', propertyId),
    update: (id, input) => ipcRenderer.invoke('panels:update', id, input),
    delete: (id) => ipcRenderer.invoke('panels:delete', id),
    reset: (id) => ipcRenderer.invoke('panels:reset', id)
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
    delete: (id) => ipcRenderer.invoke('entities:delete', id),
    getAllRooms: (panelId) => ipcRenderer.invoke('entities:getAllRooms', panelId),
    deleteRoom: (panelId, roomName) => ipcRenderer.invoke('entities:deleteRoom', panelId, roomName),
    renameRoom: (panelId, oldName, newName) => ipcRenderer.invoke('entities:renameRoom', panelId, oldName, newName),
    getAllEntityTypes: (panelId) => ipcRenderer.invoke('entities:getAllEntityTypes', panelId),
    changeEntityType: (panelId, oldType, newType) => ipcRenderer.invoke('entities:changeEntityType', panelId, oldType, newType)
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import')
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
