import { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimatedSection({ children, delay = 0, className = "" }: Props) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay }}
    >
      {children}
    </motion.section>
  );
}