import {Effect, Reducer} from "umi";
import {executeSql} from "./service";
import {
  addOrUpdateData, handleAddOrUpdate, handleRemove, handleRemoveById, postAll,
  queryData
} from "@/components/Common/crud";
import {Form} from "antd";
import {executeDDL} from "@/pages/FlinkSqlStudio/service";

export type ClusterType = {
  id: number,
  name: string,
  alias: string,
  type: string,
  hosts: string,
  jobManagerHost: string,
  status: number,
  note: string,
  enabled: boolean,
  createTime: Date,
  updateTime: Date,
}

export type TaskType = {
  id?: number,
  catalogueId?: number,
  name?: string,
  alias?: string,
  type?: string,
  checkPoint?: number,
  savePointPath?: string,
  parallelism?: number,
  fragment?: boolean,
  clusterId?: any,
  clusterName?: string,
  note?: string,
  enabled?: boolean,
  createTime?: Date,
  updateTime?: Date,
  statement?: string,
  session: string;
  maxRowNum: number;
  jobName: string;
};

export type ConsoleType = {
  result: [];
}

export type TabsItemType = {
  title: string;
  key: number,
  value: string;
  closable: boolean;
  path: string[];
  task?: TaskType;
  console: ConsoleType;
  monaco?: any;
}

export type TabsType = {
  activeKey: number;
  panes?: TabsItemType[];
}

export type RightClickMenu = {
  pageX: number,
  pageY: number,
  id: number,
  name: string
};

export type ConnectorType = {
  tablename: string;
}
export type SessionClusterType = {
  session: string;
  clusterId: number;
  clusterName: string;
  connectors: ConnectorType[];
}
export type StateType = {
  cluster?: ClusterType[];
  currentSessionCluster: SessionClusterType[];
  current: TabsItemType;
  sql?: string;
  monaco?: any;
  currentPath?: string[];
  tabs: TabsType;
  session: string[];
  rightClickMenu?: boolean;
};

export type ModelType = {
  namespace: string;
  state: StateType;
  effects: {
    saveTask: Effect;
  };
  reducers: {
    saveSql: Reducer<StateType>;
    saveCurrentPath: Reducer<StateType>;
    saveMonaco: Reducer<StateType>;
    saveTabs: Reducer<StateType>;
    changeActiveKey: Reducer<StateType>;
    saveTaskData: Reducer<StateType>;
    saveSession: Reducer<StateType>;
    showRightClickMenu: Reducer<StateType>;
    refreshCurrentSessionCluster: Reducer<StateType>;
  };
};

const getClusters = async () => {
  try {
    const {datas} = await postAll('api/cluster/listEnabledAll');
    return datas;
  } catch (error) {
    console.error('获取Flink集群失败');
    return [];
  }
};


const Model: ModelType = {
  namespace: 'Studio',
  state: {
    cluster: getClusters(),
    currentSessionCluster: {
      session: '',
      clusterId: 0,
      clusterName: '本地环境',
      connectors: [],
    },
    current: {
      title: '草稿',
      key: 0,
      value: '',
      closable: false,
      path: ['草稿'],
      task: {
        jobName: '草稿',
        checkPoint: 0,
        savePointPath: '',
        parallelism: 1,
        fragment: true,
        clusterId: 0,
        clusterName: "本地环境",
        maxRowNum: 100,
        session: '',
        alias: '草稿',
      },
      console: {
        result: [],
      },
      monaco: {},
    },
    sql: '',
    monaco: {},
    currentPath: [],
    tabs: {
      activeKey: 0,
      panes: [{
        title: '草稿',
        key: 0,
        value: '',
        closable: false,
        path: ['草稿'],
        task: {
          jobName: '草稿',
          checkPoint: 0,
          savePointPath: '',
          parallelism: 1,
          fragment: true,
          clusterId: 0,
          clusterName: "本地环境",
          session: '',
          maxRowNum: 100,
          alias: '草稿',
        },
        console: {
          result: [],
        },
        monaco: {},
      }],
    },
    session: [],
    rightClickMenu: false
  },

  effects: {
    * saveTask({payload}, {call, put}) {
      yield call(handleAddOrUpdate, 'api/task', payload);
      yield put({
        type: 'saveTaskData',
        payload,
      });
    },
  },

  reducers: {
    saveSql(state, {payload}) {
      const tabs = state.tabs;
      let newCurrent = state.current;
      newCurrent.value = payload;
      for (let i = 0; i < tabs.panes.length; i++) {
        if (tabs.panes[i].key == tabs.activeKey) {
          tabs.panes[i].value = payload;
          tabs.panes[i].task && (tabs.panes[i].task.statement = payload);
        }
      }
      return {
        ...state,
        current: {
          ...newCurrent
        },
        tabs: {
          ...tabs
        },
      };
    },
    saveCurrentPath(state, {payload}) {
      return {
        ...state,
        currentPath: payload,
      };
    },
    saveMonaco(state, {payload}) {
      return {
        ...state,
        monaco: {
          ...payload
        },
      };
    },
    saveTabs(state, {payload}) {
      let newCurrent = state.current;
      for (let i = 0; i < payload.panes.length; i++) {
        if (payload.panes[i].key == payload.activeKey) {
          newCurrent = payload.panes[i];
        }
      }
      return {
        ...state,
        current: {
          ...newCurrent,
        },
        tabs: {
          ...payload,
        },
      };
    },
    deleteTabByKey(state, {payload}) {
      let newTabs = state.tabs;
      for (let i = 0; i < newTabs.panes.length; i++) {
        if (newTabs.panes[i].key == payload) {
          newTabs.panes.splice(i, 1);
          break;
        }
      }
      let newCurrent = newTabs.panes[newTabs.panes.length - 1];
      if (newTabs.activeKey == payload) {
        newTabs.activeKey = newCurrent.key;
      }
      return {
        ...state,
        current: {
          ...newCurrent,
        },
        tabs: {
          ...newTabs,
        },
      };
    },
    changeActiveKey(state, {payload}) {
      let tabs = state.tabs;
      tabs.activeKey = payload;
      let newCurrent = state.current;
      for (let i = 0; i < tabs.panes.length; i++) {
        if (tabs.panes[i].key == tabs.activeKey) {
          newCurrent = tabs.panes[i];
        }
      }
      return {
        ...state,
        current: {
          ...newCurrent,
        },
        tabs: {
          ...tabs,
        },
        currentPath: newCurrent.path,
      };
    },
    saveTaskData(state, {payload}) {
      let newTabs = state.tabs;
      for (let i = 0; i < newTabs.panes.length; i++) {
        if (newTabs.panes[i].key == newTabs.activeKey) {
          newTabs.panes[i].task = payload;
        }
      }
      return {
        ...state,
        tabs: {
          ...newTabs,
        },
      };
    },
    saveSession(state, {payload}) {
      let newSession = state.session;
      for (let i = 0; i < newSession.length; i++) {
        if (newSession[i].key == payload) {
          return {};
        }
      }
      newSession.push(payload);
      return {
        ...state,
        session: newSession,
      };
    },
    showRightClickMenu(state, {payload}) {
      return {
        ...state,
        rightClickMenu: payload,
      };
    },
    refreshCurrentSessionCluster(state, {payload}) {
      return {
        ...state,
        currentSessionCluster: {
          ...payload
        },
      };
    },
  },
};

export default Model;
