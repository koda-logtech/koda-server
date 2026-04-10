import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password using bcrypt
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the bcrypt hash
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during hashing';
    throw new Error(`Failed to hash password: ${errorMessage}`);
  }
}

/**
 * Verify a plaintext password against a bcrypt hash
 * @param password - The plaintext password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches hash, false otherwise
 * @throws Error if inputs are invalid or verification fails
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (!hash || hash.trim().length === 0) {
    throw new Error('Hash cannot be empty');
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during verification';
    throw new Error(`Failed to verify password: ${errorMessage}`);
  }
}
