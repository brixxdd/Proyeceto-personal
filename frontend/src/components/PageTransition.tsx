import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

const pageVariants = {
  pageInitial: {
    opacity: 0,
    scale: 0.98,
    filter: 'blur(10px)',
  },
  pageAnimate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'beforeChildren',
      staggerChildren: 0.08,
    },
  },
  pageExit: {
    opacity: 0,
    scale: 0.98,
    filter: 'blur(10px)',
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}





function CurtainReveal({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="absolute inset-0 z-50"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        style={{ 
          originY: 0,
          backgroundColor: 'var(--color-background)',
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      />
      <motion.div
        className="absolute inset-0 z-40"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        style={{ 
          originY: 0,
          backgroundColor: 'var(--color-primary)',
          opacity: 0.15,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: 0.05 }}
      />
      {children}
    </div>
  )
}

function PageLoader() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
          animate={{ 
            rotate: [0, 15, -15, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="text-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🔥
          </motion.span>
        </motion.div>
        <motion.div 
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      key={typeof window !== 'undefined' ? window.location.pathname : 'page'}
      variants={pageVariants}
      initial="pageInitial"
      animate="pageAnimate"
      exit="pageExit"
      className="relative"
    >
      <CurtainReveal>
        {children}
      </CurtainReveal>
      <PageLoader />
    </motion.div>
  )
}