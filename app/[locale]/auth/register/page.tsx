'use client';

import { RegisterForm } from '@/components/Auth/RegisterForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
