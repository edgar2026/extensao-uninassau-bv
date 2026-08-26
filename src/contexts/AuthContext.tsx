/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Usuario, UserRole, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: Usuario | null;
  role: UserRole | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function profileToUsuario(profile: Profile): Usuario {
  return {
    id: profile.id,
    nome: `${profile.first_name} ${profile.last_name}`.trim(),
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    active: profile.active,
    firstAccessCompleted: profile.first_access_completed,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.user) {
        setIsLoading(false);
        return;
      }

      setSession(currentSession);

      const userProfile = await fetchProfile(currentSession.user.id);
      
      if (!userProfile) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (!userProfile.active) {
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setProfile(userProfile);
      setUser(profileToUsuario(userProfile));
      setRole(userProfile.role);
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_OUT' || !newSession?.user) {
          setUser(null);
          setRole(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const userProfile = await fetchProfile(newSession.user.id);
          
          if (!userProfile || !userProfile.active) {
            if (userProfile && !userProfile.active) {
              await supabase.auth.signOut();
            }
            setUser(null);
            setRole(null);
            setProfile(null);
          } else {
            setProfile(userProfile);
            setUser(profileToUsuario(userProfile));
            setRole(userProfile.role);
          }
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, loadSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const userProfile = await fetchProfile(session.user.id);
    if (userProfile) {
      setProfile(userProfile);
      setUser(profileToUsuario(userProfile));
      setRole(userProfile.role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, session, profile, isLoading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
