import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, MessageCircle, Users, Zap } from 'lucide-react';

const Welcome: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 rounded-lg p-2">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ChatBot App</h1>
          </div>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Your
            <span className="text-blue-600"> AI Assistant</span>
          </h2>
          {/* <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Experience the power of intelligent conversations with our advanced chatbot. 
            Get instant responses, manage your documents, and streamline your workflow.
          </p> */}
          <div className="space-x-4">
            <Link to="/register">
              <Button size="lg" className="px-8 py-3">
                Start Chatting Now
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Smart Conversations</CardTitle>
              <CardDescription>
                Engage in natural, intelligent conversations powered by advanced AI
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                Your conversations are protected with enterprise-grade security
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Get instant responses and seamless real-time interactions
              </CardDescription>
            </CardHeader>
          </Card>
        </div> */}

        {/* Call to Action */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 mb-8">
            Join thousands of users who are already experiencing the future of AI-powered assistance.
          </p>
          <div className="space-x-4">
            <Link to="/register">
              <Button size="lg" className="px-8 py-3">
                Create Free Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Already have an account?
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      {/* <footer className="container mx-auto px-4 py-8 text-center text-gray-500">
        <p>&copy; 2024 ChatBot App. All rights reserved.</p>
      </footer> */}
    </div>
  );
};

export default Welcome;
