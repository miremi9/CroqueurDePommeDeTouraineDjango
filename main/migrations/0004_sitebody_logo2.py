from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0003_remove_sitebody_backgound_image_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitebody',
            name='logo2',
            field=models.ImageField(blank=True, null=True, upload_to=''),
        ),
    ]
