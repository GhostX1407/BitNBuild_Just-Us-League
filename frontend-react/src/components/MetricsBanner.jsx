import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Siren, Truck, Copy } from 'lucide-react';

export default function MetricsBanner({ incidents = [] }) {
  // Safely fallback to an empty array to prevent map/forEach crashes if undefined is passed
  const safeIncidents = Array.isArray(incidents) ? incidents : [];

  // Calculate metrics efficiently without mutating the original array
  const metrics = useMemo(() => {
    let total = safeIncidents.length;
    let critical = 0;
    let activeDeployments = 0;
    let duplicates = 0;

    safeIncidents.forEach((inc) => {
      // Guard against null/undefined incident objects within the array
      if (!inc) return; 

      if (inc.severity === 'High') critical++;
      if (inc.status === 'Dispatching Unit') activeDeployments++;
      if (inc.is_duplicate === true) duplicates++;
    });

    return { total, critical, activeDeployments, duplicates };
  }, [safeIncidents]);

  // Card Configuration
  const cards = [
    {
      id: 'total-incidents',
      label: 'Total Incidents',
      value: metrics.total,
      icon: <AlertCircle className="w-5 h-5 text-indigo-600" aria-hidden="true" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      valueColor: 'text-indigo-700',
    },
    {
      id: 'critical-crises',
      label: 'Critical Crises',
      value: metrics.critical,
      icon: <Siren className="w-5 h-5 text-rose-600" aria-hidden="true" />,
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      valueColor: 'text-rose-700',
      showPulse: true,
    },
    {
      id: 'active-deployments',
      label: 'Active Deployments',
      value: metrics.activeDeployments,
      icon: <Truck className="w-5 h-5 text-emerald-600" aria-hidden="true" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      valueColor: 'text-emerald-700',
    },
    {
      id: 'detected-duplicates',
      label: 'Detected Duplicates',
      value: metrics.duplicates,
      icon: <Copy className="w-5 h-5 text-slate-600" aria-hidden="true" />,
      bgColor: 'bg-slate-100',
      borderColor: 'border-slate-200',
      valueColor: 'text-slate-700',
    },
  ];

  // Framer Motion staggered entrance animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: 'easeOut' } 
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
      role="region"
      aria-label="Incident Metrics Overview"
    >
      {cards.map((card) => (
        <motion.div
          key={card.id}
          variants={cardVariants}
          whileHover={{ y: -2, scale: 1.01 }}
          className={`flex items-center p-4 rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${card.borderColor}`}
        >
          {/* Icon Container */}
          <div className={`p-3 rounded-xl ${card.bgColor} mr-4 relative shrink-0`}>
            {card.icon}
            
            {/* Urgent Pulsing Indicator for Critical Crises */}
            {card.showPulse && card.value > 0 && (
              <span className="absolute top-0 right-0 flex h-2.5 w-2.5 -mt-1 -mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
              </span>
            )}
          </div>
          
          {/* Label and Value */}
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
              {card.label}
            </span>
            {/* 
              Wrap the value in motion component so if we needed to hook up a 
              number counter animation in the future, it is pre-structured for it.
            */}
            <motion.span 
              key={card.value} // Triggers a tiny re-animation on value change
              initial={{ opacity: 0.5, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.2 }}
              className={`text-2xl font-bold mt-0.5 ${card.valueColor}`}
            >
              {card.value}
            </motion.span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
