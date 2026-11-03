import {
  Controller,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import {
  UpdateProfileDto,
  updateProfileSchema,
  ChangePasswordDto,
  changePasswordSchema,
} from "./dto/update-user.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/auth.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@ApiTags("User Profile & Account")
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me/profile")
  @ApiOperation({ summary: "Update authenticated user profile" })
  @ApiOkResponse({ description: "Profile updated successfully." })
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfile(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch("auth/profile")
  @ApiOperation({ summary: "Update authenticated user profile (alias)" })
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  async updateProfileAlias(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post("me/password")
  @ApiOperation({ summary: "Change account password" })
  @ApiOkResponse({ description: "Password updated successfully." })
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post("auth/password")
  @ApiOperation({ summary: "Change account password (alias)" })
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  async changePasswordAlias(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Delete("me")
  @ApiOperation({ summary: "Delete user account" })
  @ApiOkResponse({ description: "Account marked deleted." })
  async deleteAccount(@CurrentUser("id") userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  @Delete("auth/me")
  @ApiOperation({ summary: "Delete user account (alias)" })
  async deleteAccountAlias(@CurrentUser("id") userId: string) {
    return this.usersService.deleteAccount(userId);
  }
}

