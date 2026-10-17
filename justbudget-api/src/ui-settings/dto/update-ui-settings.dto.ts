import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUiSettingsDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  spotlightCategories?: string[];

  @IsOptional() @IsObject()
  insightOptions?: Record<string, boolean>;
}
