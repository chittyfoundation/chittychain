import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Scale, Zap, Globe, Award, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthModal } from './auth/AuthModal';
import '../styles/luxury.css';

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  const features = [
    {
      icon: Shield,
      title: "Cryptographic Security",
      description: "Military-grade encryption for all legal documents and evidence chains"
    },
    {
      icon: Scale,
      title: "Cook County Compliant",
      description: "Built to exceed Illinois judicial standards and requirements"
    },
    {
      icon: Zap,
      title: "Real-Time Processing",
      description: "Instant blockchain verification with sub-second latency"
    },
    {
      icon: Globe,
      title: "Global Accessibility",
      description: "Access your cases from anywhere with enterprise-grade security"
    }
  ];

  const stats = [
    { value: "99.99%", label: "Uptime SLA" },
    { value: "256-bit", label: "AES Encryption" },
    { value: "<100ms", label: "API Latency" },
    { value: "SOC 2", label: "Certified" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black text-white overflow-hidden">
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass-luxury border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <h1 className="text-xl font-serif tracking-wide">ChittyChain</h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Button
                onClick={() => setShowAuth(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium px-6 btn-luxury"
              >
                Access Platform
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-luxury border border-amber-500/20 mb-8">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-500">Trusted by 10,000+ Legal Professionals</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-serif text-luxury-display mb-6 text-balance">
              Legal Evidence
              <span className="block gradient-luxury-gold bg-clip-text text-transparent">
                Redefined
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
              ChittyChain delivers cryptographically secure case management with immutable 
              evidence chains, designed for the modern legal professional.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => setShowAuth(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium px-8 py-6 text-lg btn-luxury"
                >
                  Start Free Trial
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-900 text-white px-8 py-6 text-lg"
                >
                  View Demo
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 animate-float-luxury opacity-20">
            <div className="w-64 h-64 rounded-full gradient-luxury-gold blur-3xl" />
          </div>
          <div className="absolute bottom-20 right-10 animate-float-luxury opacity-20 animation-delay-2000">
            <div className="w-96 h-96 rounded-full gradient-luxury-gold blur-3xl" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-serif text-amber-500 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif text-luxury-display mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built for the most demanding legal environments
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-luxury p-8 rounded-xl hover-luxury"
              >
                <div className="flex items-start gap-6">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/10">
                    <feature.icon className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-serif text-luxury-display mb-6">
              Ready to Transform Your Practice?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of legal professionals using ChittyChain
            </p>
            <Button
              size="lg"
              onClick={() => setShowAuth(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium px-10 py-6 text-lg btn-luxury"
            >
              Get Started Now
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Premium Footer */}
      <footer className="py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span className="font-serif">ChittyChain</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 ChittyChain. All rights reserved. | SOC 2 Type II Certified
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}