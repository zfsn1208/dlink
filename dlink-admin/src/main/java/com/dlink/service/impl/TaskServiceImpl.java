package com.dlink.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.dlink.assertion.Assert;
import com.dlink.cluster.FlinkCluster;
import com.dlink.db.service.impl.SuperServiceImpl;
import com.dlink.exception.BusException;
import com.dlink.executor.Executor;
import com.dlink.executor.ExecutorSetting;
import com.dlink.job.JobManager;
import com.dlink.mapper.TaskMapper;
import com.dlink.model.Cluster;
import com.dlink.model.Statement;
import com.dlink.model.Task;
import com.dlink.result.SubmitResult;
import com.dlink.service.ClusterService;
import com.dlink.service.StatementService;
import com.dlink.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 任务 服务实现类
 *
 * @author wenmo
 * @since 2021-05-24
 */
@Service
public class TaskServiceImpl extends SuperServiceImpl<TaskMapper, Task> implements TaskService {

    @Autowired
    private StatementService statementService;
    @Autowired
    private ClusterService clusterService;

    @Override
    public SubmitResult submitByTaskId(Integer id) {
        Task task = this.getById(id);
        Assert.check(task);
        Cluster cluster = clusterService.getById(task.getClusterId());
        Statement statement = statementService.getById(id);
        Assert.check(statement);
        if(cluster!=null) {
            String host = FlinkCluster.testFlinkJobManagerIP(cluster.getHosts(), cluster.getJobManagerHost());
            Assert.checkHost(host);
            if (!host.equals(cluster.getJobManagerHost())) {
                cluster.setJobManagerHost(host);
                clusterService.updateById(cluster);
            }
            JobManager jobManager = new JobManager(host,task.getRemoteExecutorSetting());
            return jobManager.submit(statement.getStatement());
        }else if(task.getClusterId()==0){
            JobManager jobManager = new JobManager(task.getLocalExecutorSetting());
            return jobManager.submit(statement.getStatement());
        }else{
            throw new BusException("该任务的集群不存在");
        }
    }

    @Override
    public Task getTaskInfoById(Integer id) {
        Task task = this.getById(id);
        if (task != null) {
            Statement statement = statementService.getById(id);
            if(task.getClusterId()!=null) {
                Cluster cluster = clusterService.getById(task.getClusterId());
                if(cluster!=null){
                    task.setClusterName(cluster.getAlias());
                }
            }
            if (statement != null) {
                task.setStatement(statement.getStatement());
            }
        }
        return task;
    }

    @Override
    public boolean saveOrUpdateTask(Task task) {
        if (task.getId() != null) {
            this.updateById(task);
            if (task.getStatement() != null) {
                Statement statement = new Statement();
                statement.setId(task.getId());
                statement.setStatement(task.getStatement());
                statementService.updateById(statement);
            }
        } else {
            if(task.getCheckPoint()==null){
                task.setCheckPoint(0);
            }
            if(task.getParallelism()==null){
                task.setParallelism(1);
            }
            if(task.getClusterId()==null){
                task.setClusterId(0);
            }
            this.save(task);
            Statement statement = new Statement();
            statement.setId(task.getId());
            if (task.getStatement() == null) {
                task.setStatement("");
            }
            statement.setStatement(task.getStatement());
            statementService.insert(statement);
        }
        return true;
    }

}
