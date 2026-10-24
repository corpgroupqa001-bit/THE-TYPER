import { AnimatePresence, motion } from 'framer-motion';

// count: 3, 2, 1, 0 (= GO). Three start lights fill red, then all turn green.
export default function RaceCountdown({ count }){
  const go = count===0;
  const lit = go ? 3 : 4-count;
  return (
    <div className="countdown" aria-live="assertive">
      <div className="start-lights">
        {[0,1,2].map(i=>(
          <span key={i} className={`light ${go ? 'green' : i<lit ? 'red' : ''}`} />
        ))}
      </div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          className={`countdown-num ${go?'go':''}`}
          initial={{ scale:1.8, opacity:0, filter:'blur(8px)' }}
          animate={{ scale:1, opacity:1, filter:'blur(0px)' }}
          exit={{ scale:0.6, opacity:0 }}
          transition={{ duration:0.35, ease:[0.2,0.8,0.2,1] }}
        >
          {go ? 'GO' : count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
