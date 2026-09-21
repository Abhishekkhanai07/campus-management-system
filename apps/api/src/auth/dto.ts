import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty()
  loginId: string;

  @IsString() @IsNotEmpty()
  password: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @IsString() @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
