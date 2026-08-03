using ITSM.Application.DTOs;
using ITSM.Application.Interfaces;
using ITSM.Application.Services;
using ITSM.Domain.Constants;
using ITSM.Domain.Entities;
using Moq;

namespace ITSM.UnitTests;

public class SlaServiceTests
{
    private readonly Mock<ISlaRepository> _slaRepository = new();
    private readonly Mock<ICurrentLanguageProvider> _languageProvider = new();
    private readonly SlaService _service;

    public SlaServiceTests()
    {
        _languageProvider
            .Setup(p => p.GetCurrentLanguage())
            .Returns(SupportedLanguages.Turkish);

        _service = new SlaService(_slaRepository.Object, _languageProvider.Object);
    }

    [Fact]
    public async Task CreateSlaAsync_WhenSlaAlreadyExistsForCombo_ReturnsNull()
    {
        var request = new CreateSlaRequest
        {
            ProjectId = 1,
            CategoryId = 2,
            PriorityId = 3,
            ResponseTimeMinutes = 30,
            ResolutionTimeMinutes = 240
        };

        var existing = new Sla
        {
            Id = 5,
            ProjectId = 1,
            CategoryId = 2,
            PriorityId = 3,
            ResponseTimeMinutes = 15,
            ResolutionTimeMinutes = 120,
            Priority = new Priority { Id = 3, Name = "Kritik" }
        };
        _slaRepository.Setup(r => r.GetByProjectCategoryPriorityAsync(1, 2, 3)).ReturnsAsync(existing);

        var result = await _service.CreateSlaAsync(request);

        Assert.Null(result);
        _slaRepository.Verify(r => r.AddAsync(It.IsAny<Sla>()), Times.Never);
    }

    [Fact]
    public async Task CreateSlaAsync_WhenNoExistingSla_CreatesAndReturnsMappedResponse()
    {
        var request = new CreateSlaRequest
        {
            ProjectId = 1,
            CategoryId = 2,
            PriorityId = 3,
            ResponseTimeMinutes = 30,
            ResolutionTimeMinutes = 240
        };

        _slaRepository.Setup(r => r.GetByProjectCategoryPriorityAsync(1, 2, 3)).ReturnsAsync((Sla?)null);

        // Servis AddAsync'ten sonra sla.Id'yi (mock'ta 0 kalır) tekrar GetByIdAsync ile
        // çekiyor - o yüzden GetByIdAsync(0) için dönecek "veritabanından gelmiş gibi"
        // tam nesneyi burada mock'luyoruz.
        var createdSla = new Sla
        {
            Id = 99,
            ProjectId = 1,
            CategoryId = 2,
            PriorityId = 3,
            ResponseTimeMinutes = 30,
            ResolutionTimeMinutes = 240,
            Priority = new Priority { Id = 3, Name = "Kritik" }
        };
        _slaRepository.Setup(r => r.GetByIdAsync(0)).ReturnsAsync(createdSla);

        var result = await _service.CreateSlaAsync(request);

        Assert.NotNull(result);
        Assert.Equal("Kritik", result!.PriorityName);
        Assert.Equal(30, result.ResponseTimeMinutes);
        Assert.Equal(240, result.ResolutionTimeMinutes);
        _slaRepository.Verify(r => r.AddAsync(It.Is<Sla>(s =>
            s.ProjectId == 1 && s.CategoryId == 2 && s.PriorityId == 3)), Times.Once);
    }

    [Fact]
    public async Task GetSlaByIdAsync_WhenNotFound_ReturnsNull()
    {
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Sla?)null);

        var result = await _service.GetSlaByIdAsync(1);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetSlaByIdAsync_WhenFound_ReturnsMappedResponse()
    {
        var sla = new Sla
        {
            Id = 1,
            ProjectId = 4,
            CategoryId = null,
            PriorityId = 2,
            ResponseTimeMinutes = 60,
            ResolutionTimeMinutes = 480,
            Priority = new Priority { Id = 2, Name = "Yüksek" }
        };
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(sla);

        var result = await _service.GetSlaByIdAsync(1);

        Assert.NotNull(result);
        Assert.Equal("Yüksek", result!.PriorityName);
        Assert.Equal(4, result.ProjectId);
        Assert.Null(result.CategoryId);
    }

    [Fact]
    public async Task UpdateSlaAsync_WhenSlaNotFound_ReturnsFalse()
    {
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Sla?)null);

        var result = await _service.UpdateSlaAsync(1, new UpdateSlaRequest { ResponseTimeMinutes = 10, ResolutionTimeMinutes = 60 });

        Assert.False(result);
        _slaRepository.Verify(r => r.UpdateAsync(It.IsAny<Sla>()), Times.Never);
    }

    [Fact]
    public async Task UpdateSlaAsync_WhenSlaFound_UpdatesOnlyDurationFieldsAndReturnsTrue()
    {
        var sla = new Sla
        {
            Id = 1,
            ProjectId = 4,
            CategoryId = 2,
            PriorityId = 3,
            ResponseTimeMinutes = 30,
            ResolutionTimeMinutes = 240,
            Priority = new Priority { Id = 3, Name = "Kritik" }
        };
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(sla);

        var result = await _service.UpdateSlaAsync(1, new UpdateSlaRequest { ResponseTimeMinutes = 15, ResolutionTimeMinutes = 120 });

        Assert.True(result);
        Assert.Equal(15, sla.ResponseTimeMinutes);
        Assert.Equal(120, sla.ResolutionTimeMinutes);
        // Kapsam (proje/kategori/öncelik) update ile değişmiyor - kimlik gibi sabit.
        Assert.Equal(4, sla.ProjectId);
        Assert.Equal(2, sla.CategoryId);
        Assert.Equal(3, sla.PriorityId);
        _slaRepository.Verify(r => r.UpdateAsync(sla), Times.Once);
    }

    [Fact]
    public async Task DeleteSlaAsync_WhenSlaNotFound_ReturnsFalse()
    {
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((Sla?)null);

        var result = await _service.DeleteSlaAsync(1);

        Assert.False(result);
        _slaRepository.Verify(r => r.DeleteAsync(It.IsAny<Sla>()), Times.Never);
    }

    [Fact]
    public async Task DeleteSlaAsync_WhenSlaFound_DeletesAndReturnsTrue()
    {
        var sla = new Sla { Id = 1, PriorityId = 1, ResponseTimeMinutes = 30, ResolutionTimeMinutes = 120, Priority = new Priority { Id = 1, Name = "Düşük" } };
        _slaRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(sla);

        var result = await _service.DeleteSlaAsync(1);

        Assert.True(result);
        _slaRepository.Verify(r => r.DeleteAsync(sla), Times.Once);
    }

    [Fact]
    public async Task GetAllSlasAsync_ReturnsMappedListForEachSla()
    {
        var slas = new List<Sla>
        {
            new() { Id = 1, PriorityId = 1, ResponseTimeMinutes = 30, ResolutionTimeMinutes = 120, Priority = new Priority { Id = 1, Name = "Düşük" } },
            new() { Id = 2, PriorityId = 2, ResponseTimeMinutes = 15, ResolutionTimeMinutes = 60, Priority = new Priority { Id = 2, Name = "Kritik" } }
        };
        _slaRepository.Setup(r => r.GetAllAsync()).ReturnsAsync(slas);

        var result = await _service.GetAllSlasAsync();

        Assert.Equal(2, result.Count);
        Assert.Equal("Düşük", result[0].PriorityName);
        Assert.Equal("Kritik", result[1].PriorityName);
    }
}
