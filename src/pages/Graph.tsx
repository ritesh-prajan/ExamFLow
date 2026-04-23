import React, { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { motion } from 'motion/react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Zap, Loader2, Info, Layout, Save, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import { suggestDependencies } from '@/services/geminiService';

const nodeWidth = 240;
const nodeHeight = 120;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  if (nodes.length === 0) return { nodes, edges };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({ rankdir: direction, nodesep: 70, ranksep: 100 });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    if (nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const x = nodeWithPosition ? nodeWithPosition.x : 0;
    const y = nodeWithPosition ? nodeWithPosition.y : 0;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: x - nodeWidth / 2,
        y: y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const TopicNode = ({ data, targetPosition, sourcePosition }: any) => {
  const isMastered = data.status === 'Mastered';
  const isInProgress = data.status === 'In Progress';

  return (
    <div className={cn(
      "px-5 py-4 rounded-2xl border-2 shadow-2xl min-w-[220px] transition-all backdrop-blur-xl",
      isMastered ? "bg-success/5 border-success shadow-success/5" :
      isInProgress ? "bg-warning/5 border-warning shadow-warning/5" :
      "bg-card border-border shadow-sm"
    )}>
      <Handle 
        type="target" 
        position={targetPosition || Position.Top} 
        className="w-3 h-3 bg-muted border-2 border-border" 
      />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{data.module}</div>
          <span className={cn(
            "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
            data.priority === 'High' ? "bg-destructive/10 text-destructive border border-destructive/20" :
            data.priority === 'Medium' ? "bg-warning/10 text-warning border border-warning/20" : 
            "bg-primary/10 text-primary border border-primary/20"
          )}>
            {data.priority}
          </span>
        </div>
        {isMastered && <CheckCircle2 size={12} className="text-success" />}
      </div>
      
      <div className="font-bold text-base leading-tight text-foreground mb-3">{data.name}</div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Mastery</span>
          <span className={cn(isMastered ? "text-success" : isInProgress ? "text-warning" : "text-muted-foreground")}>
            {data.mastery}%
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.mastery}%` }}
            className={cn(
              "h-full rounded-full",
              isMastered ? "bg-success" : isInProgress ? "bg-warning" : "bg-muted-foreground/20"
            )}
          />
        </div>
      </div>

      <Handle 
        type="source" 
        position={sourcePosition || Position.Bottom} 
        className="w-3 h-3 bg-muted border-2 border-border" 
      />
    </div>
  );
};

const nodeTypes = {
  topic: TopicNode,
};

export default function DependencyGraph() {
  const { state, updateTopicDependencies, saveGraphLayout } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  const selectedSubject = (state.subjects || []).find(s => s.id === state.selectedSubjectId);

  const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (!state.topics || (state.topics || []).length === 0) return { nodes: [], edges: [] };

    const isHorizontal = layoutDirection === 'LR';

    // Create Nodes
    state.topics.forEach((topic) => {
      const savedPos = selectedSubject?.graphLayout?.[topic.id];
      nodes.push({
        id: topic.id,
        type: 'topic',
        data: { 
          name: topic.name, 
          module: topic.module, 
          mastery: topic.mastery,
          status: topic.status,
          priority: topic.priority
        },
        position: savedPos || { x: 0, y: 0 },
        // If we have saved positions, we can't easily recalculate source/target positions 
        // without dagre, so we default based on direction
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      });
    });

    // Create Edges (AI Dependencies)
    state.topics.forEach(topic => {
      if (!topic.dependencies) return;
      topic.dependencies.forEach(depId => {
        const edgeId = `dep-${depId}-${topic.id}`;
        const edgeColor = topic.priority === 'High' ? 'var(--destructive)' : 
                         topic.priority === 'Medium' ? 'var(--warning)' : 'var(--primary)';
        
        edges.push({
          id: edgeId,
          source: depId,
          target: topic.id,
          style: { stroke: edgeColor, strokeWidth: 3, opacity: 0.8 },
          animated: topic.status !== 'Mastered' && !isLocked,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
            width: 20,
            height: 20,
          },
          label: 'Prerequisite',
          labelStyle: { fill: edgeColor, fontSize: 8, fontWeight: 'bold' },
        });
      });
    });

    if (state.modules) {
      state.modules.forEach((module) => {
        if (!module.topics) return;
        module.topics.forEach((topicId, topicIdx) => {
          if (topicIdx > 0) {
            const sourceId = module.topics[topicIdx - 1];
            const targetId = topicId;
            const edgeId = `mod-${module.id}-${sourceId}-${targetId}`;
            
            const exists = edges.some(e => 
              (e.source === sourceId && e.target === targetId) || 
              (e.source === targetId && e.target === sourceId)
            );

            if (!exists) {
              edges.push({
                id: edgeId,
                source: sourceId,
                target: targetId,
                style: { stroke: 'currentColor', strokeWidth: 2, opacity: 0.2 },
                type: 'smoothstep',
                label: 'Module Flow',
                labelStyle: { fill: 'currentColor', opacity: 0.3, fontSize: 7, fontWeight: 'bold' },
              });
            }
          }
        });
      });
    }

    if (selectedSubject?.graphLayout) {
      return { nodes, edges };
    }

    return getLayoutedElements(nodes, edges, layoutDirection);
  }, [state.topics, state.modules, layoutDirection, selectedSubject?.graphLayout, isLocked]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Auto-save on leave
  const nodesRef = React.useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    return () => {
      if (state.selectedSubjectId && nodesRef.current.length > 0) {
        const layout: Record<string, { x: number; y: number }> = {};
        nodesRef.current.forEach(node => {
          layout[node.id] = node.position;
        });
        saveGraphLayout(state.selectedSubjectId, layout).catch(err => 
          console.error("Auto-save failed:", err)
        );
      }
    };
  }, [state.selectedSubjectId]);

  const onConnect = useCallback((params: Connection) => {
    if (isLocked) return;
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges, isLocked]);

  const handleSaveLayout = async () => {
    if (!state.selectedSubjectId) return;
    setIsSaving(true);
    
    try {
      const layout: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        layout[node.id] = node.position;
      });
      await saveGraphLayout(state.selectedSubjectId, layout);
    } catch (error) {
      console.error("Failed to save layout:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDependencies = async () => {
    if (!selectedSubject || !state.topics || state.topics.length === 0) return;
    
    setIsGenerating(true);
    try {
      const suggestions = await suggestDependencies(state.topics, selectedSubject.name);
      const promises = suggestions.map(s => updateTopicDependencies(s.topicId, s.prerequisiteIds));
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to generate dependencies:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleLayout = () => {
    setLayoutDirection(prev => prev === 'TB' ? 'LR' : 'TB');
  };

  if (state.loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-slate-400 font-medium animate-pulse">Loading your knowledge map...</p>
        </div>
      </div>
    );
  }

  if (!selectedSubject) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-card border border-border flex items-center justify-center shadow-2xl">
          <Info className="text-primary" size={40} />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-2">No Subject Selected</h2>
          <p className="text-muted-foreground mb-8">Please select a subject from your dashboard to visualize its dependency tree.</p>
          <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20">
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full pt-16 relative bg-transparent">
      <div className="absolute top-24 left-8 z-20 pointer-events-none">
        <div className="mb-6 pointer-events-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-1">Dependency Tree</h1>
        <p className="text-muted-foreground mb-6">Hierarchical prerequisite mapping.</p>
        
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            onClick={handleGenerateDependencies}
            disabled={isGenerating || isLocked}
            title="AI Analyze Dependencies"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-30"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="currentColor" />}
          </button>
          
          <button
            onClick={toggleLayout}
            disabled={isLocked}
            title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'} Layout`}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-all shadow-lg disabled:opacity-30"
          >
            <Layout size={18} />
          </button>

          <button
            onClick={handleSaveLayout}
            disabled={isLocked}
            title="Save Graph Layout"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? 'Unlock Graph' : 'Lock Graph'}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full border transition-all shadow-lg",
              isLocked 
                ? "bg-destructive/20 border-destructive/40 text-destructive" 
                : "bg-card border border-border text-foreground hover:bg-muted"
            )}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle Graph Legend"
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full border transition-all shadow-lg",
              showLegend 
                ? "bg-primary/20 border-primary/40 text-primary" 
                : "bg-card border border-border text-foreground hover:bg-muted"
            )}
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {nodes.length > 0 ? (
        <ReactFlow
          key={`${state.selectedSubjectId}-${layoutDirection}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-transparent"
          style={{ width: '100%', height: '100%' }}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          panOnDrag={true}
        >
          <Background 
            color={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} 
            gap={20} 
            size={1} 
          />
          <Controls className="bg-card border border-border fill-foreground" />
          
          {/* Legend Popover */}
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: showLegend ? 1 : 0, 
              y: showLegend ? 0 : 20,
              scale: showLegend ? 1 : 0.95,
              pointerEvents: showLegend ? 'auto' : 'none'
            }}
            className="absolute bottom-8 left-8 glass p-5 flex flex-col gap-4 z-40 bg-card/80 backdrop-blur-2xl border border-border rounded-2xl w-72 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Info size={12} /> Graph Legend
              </div>
              <button onClick={() => setShowLegend(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Layout size={12} className="rotate-45" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Dependencies</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 bg-destructive rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                  <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">High Priority</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 bg-warning rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                  <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Medium Priority</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Low Priority</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-0.5 bg-muted-foreground/20 rounded-full" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Module Flow</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Topic Status</div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-success/10 border border-success" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Mastered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-warning/10 border border-warning" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-muted border border-border" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Not Started</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <MiniMap 
            nodeColor={(n) => {
              if (n.type === 'topic') return 'var(--primary)';
              return 'var(--muted)';
            }}
            maskColor="rgba(var(--background), 0.7)"
            className="bg-card border border-border"
          />
        </ReactFlow>
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-[#050608]">
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-slate-400 font-medium">Building your dependency tree...</p>
          </div>
        </div>
      )}
    </div>
  );
}
