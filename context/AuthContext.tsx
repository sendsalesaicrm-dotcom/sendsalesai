import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Organization, Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  currentOrganization: Organization | null;
  userRole: 'owner' | 'admin' | 'agent' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'agent' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndOrg(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true);
        fetchProfileAndOrg(session.user.id);
      } else {
        setProfile(null);
        setCurrentOrganization(null);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndOrg = async (userId: string) => {
    try {
      // A. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // B. Fetch Organization via Member table
      // We take the first organization found for simplicity in this version
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (memberError) {
        console.warn('User has no organization:', memberError.message);
        setCurrentOrganization(null);
        setUserRole(null);
      } else if (memberData && memberData.organizations) {
        // @ts-ignore - Supabase types join mapping
        setCurrentOrganization(memberData.organizations as Organization);
        setUserRole(memberData.role);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    
    if (error) {
      return { error };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setCurrentOrganization(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      currentOrganization, 
      userRole, 
      isAuthenticated: !!session, 
      login, 
      logout, 
      isLoading 
    }}>
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